"""
PWA Icon Generator for Farm Monitor App
Generates all required PWA icons with visible plant graphic
Run: python generate_icons.py
"""

from PIL import Image, ImageDraw, ImageFont
import os

# Icon configurations
ICONS = [
    {"size": 64, "name": "pwa-64x64.png"},
    {"size": 192, "name": "pwa-192x192.png"},
    {"size": 512, "name": "pwa-512x512.png"},
    {"size": 512, "name": "maskable-icon-512x512.png", "maskable": True},
    {"size": 180, "name": "apple-touch-icon.png"}  # iOS specific
]

# Brand colors
BG_COLOR = (136, 176, 75)  # #88B04B - Green
LEAF_COLOR = (106, 144, 55)  # Darker green for leaves
STEM_COLOR = (85, 115, 45)  # Even darker for stem

def draw_plant_icon(draw, size):
    """Draw a simple plant/leaf icon"""
    center_x = size // 2
    center_y = size // 2
    
    # Scale factor
    scale = size / 200
    
    # Draw stem
    stem_width = int(8 * scale)
    stem_height = int(60 * scale)
    draw.rectangle(
        [center_x - stem_width//2, center_y - stem_height//2, 
         center_x + stem_width//2, center_y + stem_height + 20 * scale],
        fill=STEM_COLOR
    )
    
    # Draw leaves (simple ellipses)
    leaf_width = int(50 * scale)
    leaf_height = int(35 * scale)
    
    # Left leaf
    draw.ellipse(
        [center_x - leaf_width - 5*scale, center_y - 10*scale,
         center_x, center_y + leaf_height - 10*scale],
        fill=LEAF_COLOR
    )
    
    # Right leaf
    draw.ellipse(
        [center_x, center_y - 10*scale,
         center_x + leaf_width + 5*scale, center_y + leaf_height - 10*scale],
        fill=LEAF_COLOR
    )
    
    # Top leaf (lighter green)
    draw.ellipse(
        [center_x - leaf_width//2, center_y - leaf_height - 20*scale,
         center_x + leaf_width//2, center_y - 20*scale],
        fill=(150, 200, 90)
    )

def generate_icons():
    """Generate all PWA icons"""
    try:
        print("🎨 Generating PWA icons with plant graphic...")
        
        for config in ICONS:
            size = config["size"]
            name = config["name"]
            is_maskable = config.get("maskable", False)
            
            # Create new image with background color
            icon = Image.new("RGB", (size, size), BG_COLOR)
            draw = ImageDraw.Draw(icon)
            
            if is_maskable:
                # Maskable icon - add 20% safe zone padding
                padding = int(size * 0.2)
                # Draw plant in safe zone
                icon_inner = Image.new("RGB", (size - padding * 2, size - padding * 2), BG_COLOR)
                draw_inner = ImageDraw.Draw(icon_inner)
                draw_plant_icon(draw_inner, size - padding * 2)
                icon.paste(icon_inner, (padding, padding))
            else:
                # Regular icon - draw plant
                draw_plant_icon(draw, size)
            
            # Save icon
            output_path = os.path.join("public", name)
            icon.save(output_path, "PNG", optimize=True, quality=95)
            
            print(f"✅ Generated {name} ({size}x{size})")
        
        print("🎉 All icons generated successfully!")
        print("📁 Icons saved to public/ folder")
        
    except Exception as e:
        print(f"❌ Error generating icons: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    generate_icons()
