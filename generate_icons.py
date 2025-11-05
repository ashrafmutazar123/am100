"""
PWA Icon Generator for Farm Monitor App
Generates all required PWA icons from the source GIF
Run: python generate_icons.py
"""

from PIL import Image, ImageDraw
import os

# Icon configurations
ICONS = [
    {"size": 64, "name": "pwa-64x64.png"},
    {"size": 192, "name": "pwa-192x192.png"},
    {"size": 512, "name": "pwa-512x512.png"},
    {"size": 512, "name": "maskable-icon-512x512.png", "maskable": True}
]

# Brand color
BACKGROUND_COLOR = "#88B04B"

def generate_icons():
    """Generate all PWA icons"""
    try:
        print("🎨 Generating PWA icons...")
        
        # Load source image
        source_path = os.path.join("public", "organic.gif")
        if not os.path.exists(source_path):
            print(f"❌ Source image not found: {source_path}")
            return
        
        source_img = Image.open(source_path).convert("RGBA")
        
        for config in ICONS:
            size = config["size"]
            name = config["name"]
            is_maskable = config.get("maskable", False)
            
            # Create new image with background color
            icon = Image.new("RGBA", (size, size), BACKGROUND_COLOR)
            
            if is_maskable:
                # Maskable icon - add 20% safe zone padding
                padding = int(size * 0.2)
                icon_size = size - (padding * 2)
                resized = source_img.resize((icon_size, icon_size), Image.Resampling.LANCZOS)
                icon.paste(resized, (padding, padding), resized)
            else:
                # Regular icon - full size
                resized = source_img.resize((size, size), Image.Resampling.LANCZOS)
                icon.paste(resized, (0, 0), resized)
            
            # Convert to RGB for PNG (remove alpha if not needed)
            icon = icon.convert("RGB")
            
            # Save icon
            output_path = os.path.join("public", name)
            icon.save(output_path, "PNG", optimize=True)
            
            print(f"✅ Generated {name}")
        
        print("🎉 All icons generated successfully!")
        print("📁 Icons saved to public/ folder")
        
    except Exception as e:
        print(f"❌ Error generating icons: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    generate_icons()
