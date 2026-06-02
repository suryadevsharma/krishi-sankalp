import os
from PIL import Image, ImageDraw

def create_icons():
    # Target public folder
    public_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend", "public")
    os.makedirs(public_dir, exist_ok=True)
    
    # Define resolutions
    sizes = {
        "pwa-192x192.png": (192, 192),
        "pwa-512x512.png": (512, 512),
        "apple-touch-icon.png": (180, 180),
        "favicon.ico": (32, 32)
    }
    
    for filename, size in sizes.items():
        img_path = os.path.join(public_dir, filename)
        
        # Draw a beautiful green circle canvas with a yellow crop sprout in the center
        img = Image.new("RGBA", size, color=(26, 92, 42, 255))
        draw = ImageDraw.Draw(img)
        
        # Draw golden central leaf circle represent sprout
        w, h = size
        draw.ellipse([w*0.3, h*0.3, w*0.7, h*0.7], fill=(212, 135, 10, 255))
        draw.ellipse([w*0.38, h*0.32, w*0.62, h*0.68], fill=(26, 92, 42, 255))
        draw.polygon([(w*0.5, h*0.25), (w*0.42, h*0.48), (w*0.58, h*0.48)], fill=(212, 135, 10, 255))
        
        # Save image
        img.save(img_path)
        print(f"Generated asset: {img_path}")

if __name__ == "__main__":
    create_icons()
