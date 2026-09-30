import os
from PIL import Image

def generate_icons():
    # Source image
    src_path = 'images/logo.png'
    if not os.path.exists(src_path):
        src_path = 'public/images/logo.png'
    
    img = Image.open(src_path).convert('RGBA')
    
    # In images/logo.png:
    # Find the bounding box of the orange circle and its inner white symbol
    # The circle is located in x in [20, 205], y in [25, 200]
    # We want ONLY the orange circle + inner white symbol (no TM text, no grey/white divider line)
    
    # We find pixels that are part of the emblem:
    # 1. Orange pixels (R > 180, G > 100, B < 60, A > 30)
    # 2. White pixels inside or near the circle (R > 230, G > 230, B > 230, A > 30)
    
    w, h = img.size
    orange_pts = []
    for y in range(h):
        for x in range(min(w, 230)):
            r, g, b, a = img.getpixel((x, y))
            if a > 40 and r > 180 and g > 100 and b < 60:
                orange_pts.append((x, y))
                
    if not orange_pts:
        raise ValueError("Orange emblem not found")
        
    min_x = min(p[0] for p in orange_pts)
    max_x = max(p[0] for p in orange_pts)
    min_y = min(p[1] for p in orange_pts)
    max_y = max(p[1] for p in orange_pts)
    
    # Find the vertical and horizontal center of the circle
    center_x = (min_x + max_x) / 2.0
    center_y = (min_y + max_y) / 2.0
    radius = max((max_x - min_x) / 2.0, (max_y - min_y) / 2.0) + 1.0
    
    print(f"Emblem center: ({center_x}, {center_y}), radius: {radius}")
    
    # Extract only pixels within radius + 2 to avoid any divider lines or TM text
    emblem_canvas = Image.new('RGBA', img.size, (0, 0, 0, 0))
    for y in range(int(center_y - radius - 3), int(center_y + radius + 4)):
        for x in range(int(center_x - radius - 3), int(center_x + radius + 4)):
            if 0 <= x < w and 0 <= y < h:
                # Check distance to center
                dist = ((x - center_x) ** 2 + (y - center_y) ** 2) ** 0.5
                if dist <= radius + 1.5:
                    r, g, b, a = img.getpixel((x, y))
                    # Check if this pixel is part of the emblem (orange or white or anti-aliased edge)
                    if a > 10:
                        emblem_canvas.putpixel((x, y), (r, g, b, a))
                        
    # Crop to exact square bounding box centered around the emblem
    crop_size = int(radius * 2 + 4)
    left = int(center_x - crop_size / 2)
    top = int(center_y - crop_size / 2)
    emblem_square = emblem_canvas.crop((left, top, left + crop_size, top + crop_size))
    
    # Add a slight padding (around 6%) to look beautiful in browser tabs
    final_canvas_size = int(crop_size * 1.12)
    final_img = Image.new('RGBA', (final_canvas_size, final_canvas_size), (0, 0, 0, 0))
    offset = (final_canvas_size - crop_size) // 2
    final_img.paste(emblem_square, (offset, offset), emblem_square)
    
    # High resolution 512x512
    high_res = final_img.resize((512, 512), Image.Resampling.LANCZOS)
    
    # Ensure dirs exist
    os.makedirs('public/images', exist_ok=True)
    os.makedirs('app', exist_ok=True)
    
    # 1. Save PNG icon for public
    high_res.save('public/images/favicon.png', 'PNG')
    
    # 2. Save Apple touch icon (180x180)
    apple_icon = final_img.resize((180, 180), Image.Resampling.LANCZOS)
    apple_icon.save('public/images/apple-icon.png', 'PNG')
    apple_icon.save('app/apple-icon.png', 'PNG')
    
    # 3. Save standard icon.png for Next.js app directory (32x32)
    icon_32 = final_img.resize((32, 32), Image.Resampling.LANCZOS)
    icon_32.save('app/icon.png', 'PNG')
    
    # 4. Save multi-resolution favicon.ico (16x16, 32x32, 48x48)
    ico_sizes = [(16, 16), (32, 32), (48, 48)]
    ico_imgs = [final_img.resize(s, Image.Resampling.LANCZOS) for s in ico_sizes]
    
    ico_imgs[0].save(
        'public/favicon.ico',
        format='ICO',
        sizes=ico_sizes,
        append_images=ico_imgs[1:]
    )
    ico_imgs[0].save(
        'app/favicon.ico',
        format='ICO',
        sizes=ico_sizes,
        append_images=ico_imgs[1:]
    )
    
    # Clean up test files if any
    for test_file in ['public/images/test_crop.png', 'public/images/test_crop2.png']:
        if os.path.exists(test_file):
            os.remove(test_file)
            
    print("Successfully generated all icons and favicon.ico in original format!")

if __name__ == '__main__':
    generate_icons()
