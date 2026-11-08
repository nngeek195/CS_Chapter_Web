import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { randomInt } from 'crypto';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';
import { getCaller, can, forbidden } from '@/lib/serverAuth';

const resend = new Resend(process.env.RESEND_API_KEY);

// ── Permission metadata for email display ──────────────────────────────────
const PERMISSION_META: Record<string, { label: string; desc: string }> = {
  events:     { label: 'Manage Events',     desc: 'Create, edit and delete events' },
  leadership: { label: 'Manage Leadership', desc: 'Edit committee members and structure' },
  gallery:    { label: 'Manage Gallery',    desc: 'Upload and delete chapter photos' },
  resources:  { label: 'Manage Resources',  desc: 'Add and edit learning materials' },
  messages:   { label: 'View Inquiries',    desc: 'Read and manage contact messages' },
  volunteers: { label: 'Manage Volunteer Calls', desc: 'Create recruitment forms and review applicants' },
  board:      { label: 'Manage Board',      desc: 'Invite and manage board members' },
};

// ── Temp password generator ────────────────────────────────────────────────
function generateTempPassword(length = 14): string {
  const upper  = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower  = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$%';
  const all = upper + lower + digits + special;
  // Ensure at least one of each required character class
  let pw =
    upper[randomInt(upper.length)] +
    lower[randomInt(lower.length)] +
    digits[randomInt(digits.length)] +
    special[randomInt(special.length)];
  for (let i = pw.length; i < length; i++) {
    pw += all[randomInt(all.length)];
  }
  // Shuffle
  const chars = pw.split('');
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

// ── Create Firebase Auth user via Admin SDK ────────────────────────────────
async function createFirebaseAuthUser(email: string, password: string): Promise<void> {
  const auth = getAdminAuth();
  try {
    await auth.createUser({ email, password });
  } catch (err: any) {
    if (err?.code !== 'auth/email-already-exists') throw err;

    // User already exists (re-invite case) — update their password so it
    // matches the new temp password that will be emailed to them.
    const existing = await auth.getUserByEmail(email);
    await auth.updateUser(existing.uid, { password });
  }
}

// ── Build invitation email (HTML + plain text) ─────────────────────────────
interface InviteEmailOptions {
  name: string;
  role: string;
  email: string;
  tempPassword: string;
  permissions: string[];
  loginUrl: string;
}

function escapeHtml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function permissionList(permissions: string[]) {
  return (permissions || []).map((key) => PERMISSION_META[key] ?? { label: key, desc: '' });
}

function buildInviteEmail(opts: InviteEmailOptions): string {
  const name = escapeHtml(opts.name);
  const role = escapeHtml(opts.role);
  const email = escapeHtml(opts.email);
  const tempPassword = escapeHtml(opts.tempPassword);
  const loginUrl = escapeHtml(opts.loginUrl);
  const firstName = escapeHtml(opts.name.trim().split(/\s+/)[0] || opts.name);
  const siteUrl = escapeHtml(opts.loginUrl.replace(/\/login\/?$/, ''));
  const year = new Date().getFullYear();
  const font = "font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";

  const perms = permissionList(opts.permissions);
  const permRows = perms.length
    ? perms
        .map(
          (p, i) => `
              <tr>
                <td style="padding:12px 16px;${i < perms.length - 1 ? 'border-bottom:1px solid #e5eaf0;' : ''}">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td width="10" valign="top" style="padding-top:6px;">
                        <div style="width:8px;height:8px;border-radius:2px;background:#00629B;font-size:0;line-height:0;">&nbsp;</div>
                      </td>
                      <td style="padding-left:12px;${font}">
                        <div style="font-size:14px;font-weight:600;color:#101820;">${escapeHtml(p.label)}</div>
                        ${p.desc ? `<div style="font-size:13px;color:#60707c;margin-top:2px;">${escapeHtml(p.desc)}</div>` : ''}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>`
        )
        .join('')
    : `<tr><td style="padding:12px 16px;${font}font-size:13px;color:#60707c;">No permissions assigned yet — an administrator will grant access shortly.</td></tr>`;

  const step = (n: number, title: string, text: string) => `
              <tr>
                <td width="28" valign="top" style="padding:0 0 14px;">
                  <div style="width:24px;height:24px;border-radius:12px;background:#e8f1f7;color:#00629B;${font}font-size:12px;font-weight:700;line-height:24px;text-align:center;">${n}</div>
                </td>
                <td valign="top" style="padding:2px 0 14px 12px;${font}">
                  <div style="font-size:14px;font-weight:600;color:#101820;">${title}</div>
                  <div style="font-size:13px;color:#60707c;margin-top:2px;line-height:1.5;">${text}</div>
                </td>
              </tr>`;

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>Invitation to the IEEE CS SUSL Chapter Portal</title>
  <!--[if mso]><style>table,td,div,p,a{font-family:Arial,sans-serif !important;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background:#f2f5f8;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:#f2f5f8;">
    You have been invited to join the IEEE CS SUSL Chapter Portal as ${role}. Your temporary sign-in details are inside.&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f2f5f8;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e1e7ee;border-radius:12px;overflow:hidden;">

          <!-- Header band -->
          <tr>
            <td style="background:#003B5C;padding:28px 36px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="middle">
                    <img src="${siteUrl}/images/logo.png" alt="IEEE CS SUSL" height="36" style="display:block;height:36px;width:auto;border:0;outline:none;text-decoration:none;" />
                  </td>
                  <td valign="middle" align="right" style="${font}font-size:11px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:#9cc7e0;">
                    Chapter Portal
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr><td style="background:#00629B;height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>

          <!-- Intro -->
          <tr>
            <td style="padding:36px 36px 8px;${font}">
              <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#00629B;">Board invitation</p>
              <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;font-weight:700;color:#101820;">Welcome to the team, ${firstName}</h1>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.65;color:#3b4a56;">
                You have been invited to join the <strong style="color:#101820;">IEEE Computer Society Student Branch Chapter</strong>
                at Sabaragamuwa University of Sri Lanka as <strong style="color:#101820;">${role}</strong>.
              </p>
              <p style="margin:0;font-size:15px;line-height:1.65;color:#3b4a56;">
                Your portal account has been created. Use the temporary credentials below to sign in for the first time.
              </p>
            </td>
          </tr>

          <!-- Credentials -->
          <tr>
            <td style="padding:24px 36px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f7f9fb;border:1px solid #e1e7ee;border-radius:10px;">
                <tr>
                  <td style="padding:18px 20px 8px;${font}">
                    <div style="font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#60707c;">Sign-in email</div>
                    <div style="font-size:15px;color:#101820;margin-top:4px;word-break:break-all;">${email}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 20px 18px;${font}">
                    <div style="font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#60707c;">Temporary password</div>
                    <div style="margin-top:6px;display:inline-block;background:#ffffff;border:1px solid #cfdbe5;border-radius:6px;padding:8px 12px;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:16px;font-weight:700;letter-spacing:1px;color:#003B5C;word-break:break-all;">${tempPassword}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="left" style="padding:24px 36px 8px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" bgcolor="#00629B" style="border-radius:8px;background:#00629B;">
                    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${loginUrl}" style="height:46px;v-text-anchor:middle;width:240px;" arcsize="18%" stroke="f" fillcolor="#00629B"><w:anchorlock/><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">Sign in to the portal</center></v:roundrect><![endif]-->
                    <!--[if !mso]><!-->
                    <a href="${loginUrl}" target="_blank" style="display:inline-block;padding:14px 28px;${font}font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">Sign in to the portal &rarr;</a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>
              <p style="margin:12px 0 0;${font}font-size:12px;color:#60707c;line-height:1.5;">
                Or copy this link into your browser:<br />
                <a href="${loginUrl}" style="color:#00629B;word-break:break-all;">${loginUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Next steps -->
          <tr>
            <td style="padding:28px 36px 4px;">
              <h2 style="margin:0 0 16px;${font}font-size:16px;font-weight:700;color:#101820;">Getting started</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${step(1, 'Sign in', 'Use your email address and the temporary password above.')}
                ${step(2, 'Set a new password', 'You will be asked to choose a secure password on your first sign-in.')}
                ${step(3, 'Start managing', 'Open the sections assigned to you from your member dashboard.')}
              </table>
            </td>
          </tr>

          <!-- Permissions -->
          <tr>
            <td style="padding:16px 36px 8px;">
              <h2 style="margin:0 0 6px;${font}font-size:16px;font-weight:700;color:#101820;">Your access</h2>
              <p style="margin:0 0 14px;${font}font-size:13px;color:#60707c;">You have been granted the following permissions:</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e1e7ee;border-radius:10px;">
                ${permRows}
              </table>
            </td>
          </tr>

          <!-- Security note -->
          <tr>
            <td style="padding:24px 36px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff8ec;border:1px solid #f3dfb8;border-left:4px solid #d97706;border-radius:8px;">
                <tr>
                  <td style="padding:14px 18px;${font}font-size:13px;line-height:1.6;color:#6b4a12;">
                    <strong style="color:#4a3209;">Security notice.</strong>
                    This password is temporary and must be changed when you first sign in. Never share it with anyone.
                    If you were not expecting this invitation, you can safely ignore this email or contact the chapter administrator.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f7f9fb;border-top:1px solid #e1e7ee;padding:22px 36px;${font}font-size:12px;line-height:1.6;color:#7a8893;">
              <strong style="color:#3b4a56;">IEEE Computer Society Student Branch Chapter</strong><br />
              Sabaragamuwa University of Sri Lanka<br />
              <a href="${siteUrl}" style="color:#00629B;text-decoration:none;">${siteUrl.replace(/^https?:\/\//, '')}</a><br />
              <span style="color:#9aa6af;">This is an automated message — please do not reply. &copy; ${year} IEEE CS SUSL.</span>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildInviteText(opts: InviteEmailOptions): string {
  const perms = permissionList(opts.permissions)
    .map((p) => `  - ${p.label}${p.desc ? `: ${p.desc}` : ''}`)
    .join('\n');
  return [
    `Welcome to the team, ${opts.name.trim().split(/\s+/)[0] || opts.name}`,
    '',
    `You have been invited to join the IEEE Computer Society Student Branch Chapter at Sabaragamuwa University of Sri Lanka as ${opts.role}.`,
    '',
    'Your temporary sign-in details:',
    `  Email:              ${opts.email}`,
    `  Temporary password: ${opts.tempPassword}`,
    '',
    `Sign in: ${opts.loginUrl}`,
    '',
    'Getting started:',
    '  1. Sign in with your email and the temporary password above.',
    '  2. Set a new, secure password when prompted.',
    '  3. Open the sections assigned to you from your member dashboard.',
    '',
    'Your access:',
    perms || '  (No permissions assigned yet)',
    '',
    'Security notice: this password is temporary and must be changed on first sign-in. If you were not expecting this invitation, you can ignore this email.',
    '',
    '-- ',
    'IEEE Computer Society Student Branch Chapter',
    'Sabaragamuwa University of Sri Lanka',
    'This is an automated message.',
  ].join('\n');
}

// ── Helpers ────────────────────────────────────────────────────────────────
const normEmail = (e: unknown) => (typeof e === 'string' ? e.trim().toLowerCase() : '');

async function findBoardMemberRecords(email: string) {
  const snap = await getAdminDb().collection('board_members').get();
  return snap.docs.filter((d) => normEmail(d.data().email) === normEmail(email));
}

// ── POST handler ───────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const callerInfo = await getCaller(req);
    if (callerInfo instanceof NextResponse) return callerInfo;
    if (!can(callerInfo, 'board')) return forbidden('You do not have permission to manage board members');
    const caller = callerInfo.email;
    const adminAuth = getAdminAuth();

    const body = await req.json();
    const { name, role, email, permissions } = body as {
      name: string;
      role: string;
      email: string;
      permissions: string[];
    };

    if (!name || !role || !email) {
      return NextResponse.json({ error: 'name, role and email are required' }, { status: 400 });
    }

    if (normEmail(email) === caller) {
      return NextResponse.json({ error: 'You cannot re-invite your own account' }, { status: 400 });
    }

    // Never reset the password of an existing account that is NOT a board
    // member (i.e. an admin account) — that would allow account takeover.
    const existingUser = await adminAuth.getUserByEmail(email).catch(() => null);
    const isAdminAccount = existingUser ? (await getAdminDb().doc(`admins/${existingUser.uid}`).get()).exists : false;
    if (existingUser && (isAdminAccount || (await findBoardMemberRecords(email)).length === 0)) {
      return NextResponse.json(
        { error: 'This email already belongs to a portal admin account and cannot be invited as a board member.' },
        { status: 409 }
      );
    }

    const tempPassword = generateTempPassword(14);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cschaptersusl.org';
    const loginUrl = `${siteUrl}/login`;

    // 1. Create Firebase Auth account with temporary password
    await createFirebaseAuthUser(email, tempPassword);

    // 2. Build & send invitation email
    const html = buildInviteEmail({ name, role, email, tempPassword, permissions, loginUrl });
    const text = buildInviteText({ name, role, email, tempPassword, permissions, loginUrl });

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'IEEE CS SUSL <info@cschaptersusl.org>';

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: `Invitation to the IEEE CS SUSL Chapter Portal — ${role}`,
      html,
      text,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, tempPassword, emailId: data?.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Invite board member error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
