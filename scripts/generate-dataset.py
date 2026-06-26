"""
═══════════════════════════════════════════════════════════════════════════════
SYNTHETIC DATASET GENERATOR — Zaytoun Vision
═══════════════════════════════════════════════════════════════════════════════

Generates synthetic training images that simulate the RGB fluorescence
patterns of olive oil samples under UV illumination.

SCIENTIFIC BASIS:
  Pure Extra Virgin Olive Oil (EVOO) exhibits characteristic fluorescence
  under UV light due to natural pigments:
    - Chlorophyll → Red/deep green fluorescence (680nm emission)
    - Polyphenols → Blue fluorescence (400-450nm emission)
    - Carotenoids → Green-gold fluorescence

  Adulteration with seed oils (soybean, sunflower, canola) reduces these
  natural pigments, resulting in:
    - Lighter, more yellow appearance
    - Reduced green channel intensity
    - Higher transparency / lower saturation

CLASSES:
  1. pure_evoo (100 images)
     Deep green-gold tones, high chlorophyll signature
     Simulated purity: 85-100%

  2. light_adulteration (100 images)
     Lighter yellow-green, moderate pigment reduction
     Simulated purity: 50-84%

  3. heavy_adulteration (100 images)
     Pale, almost transparent, minimal fluorescence
     Simulated purity: 0-49%

USAGE:
  python scripts/generate-dataset.py

OUTPUT:
  datasets/
  ├── pure_evoo/          (100 images)
  ├── light_adulteration/ (100 images)
  ├── heavy_adulteration/ (100 images)
  └── labels.csv
═══════════════════════════════════════════════════════════════════════════════
"""

import os
import csv
import random
import math
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFilter
except ImportError:
    print("Error: Pillow is required. Install it with: pip install Pillow")
    print("  or: pip install pillow")
    exit(1)

# ─── Configuration ────────────────────────────────────────────────────────────

DATASET_DIR = Path(__file__).parent.parent / "datasets"
IMAGE_SIZE = (224, 224)  # Standard input size for Custom Vision
IMAGES_PER_CLASS = 100
RANDOM_SEED = 42

# ─── Color Palettes (simulating fluorescence spectra) ─────────────────────────

# Each class has a base color range (R, G, B) and variation parameters
CLASS_CONFIG = {
    "pure_evoo": {
        "description": "Pure Extra Virgin Olive Oil — deep green-gold fluorescence",
        "base_colors": [
            (45, 120, 35),   # Deep olive green
            (65, 130, 25),   # Forest green
            (80, 140, 30),   # Rich green-gold
            (55, 110, 20),   # Dark chlorophyll green
            (70, 125, 40),   # Emerald olive
        ],
        "color_variance": 25,
        "noise_level": 15,
        "saturation_range": (0.7, 1.0),
        "gradient_strength": 0.4,
    },
    "light_adulteration": {
        "description": "Light adulteration — shifted yellow-green, reduced pigments",
        "base_colors": [
            (140, 150, 50),  # Yellow-green
            (160, 155, 45),  # Golden yellow
            (130, 140, 60),  # Muted olive
            (150, 145, 55),  # Faded green-gold
            (145, 160, 40),  # Light olive
        ],
        "color_variance": 30,
        "noise_level": 20,
        "saturation_range": (0.4, 0.7),
        "gradient_strength": 0.3,
    },
    "heavy_adulteration": {
        "description": "Heavy adulteration — pale, near-transparent, minimal fluorescence",
        "base_colors": [
            (210, 205, 170),  # Pale cream
            (220, 215, 180),  # Almost white
            (200, 195, 165),  # Light beige
            (215, 210, 175),  # Washed out
            (225, 220, 190),  # Near transparent
        ],
        "color_variance": 15,
        "noise_level": 10,
        "saturation_range": (0.1, 0.35),
        "gradient_strength": 0.15,
    },
}


# ─── Image Generation Functions ───────────────────────────────────────────────

def generate_fluorescence_image(
    base_color: tuple,
    color_variance: int,
    noise_level: int,
    saturation_range: tuple,
    gradient_strength: float,
    seed: int,
) -> Image.Image:
    """
    Generates a synthetic fluorescence image simulating olive oil under UV light.

    The image combines several visual effects:
      1. Base color gradient (simulating uneven illumination)
      2. Circular vignette (simulating petri dish / cuvette edges)
      3. Random noise (simulating sensor noise and sample texture)
      4. Color variation (simulating natural pigment distribution)
    """
    rng = random.Random(seed)
    width, height = IMAGE_SIZE
    img = Image.new("RGB", IMAGE_SIZE)
    pixels = img.load()

    # Generate per-pixel values
    center_x, center_y = width // 2, height // 2
    max_dist = math.sqrt(center_x**2 + center_y**2)

    for y in range(height):
        for x in range(width):
            # Distance from center (for vignette effect)
            dist = math.sqrt((x - center_x) ** 2 + (y - center_y) ** 2)
            vignette = max(0, 1 - (dist / max_dist) * 1.2)

            # Gradient effect (simulating uneven UV illumination)
            gradient_x = (x / width) * gradient_strength
            gradient_y = (y / height) * gradient_strength * 0.5

            # Base color with variance
            r = base_color[0] + rng.randint(-color_variance, color_variance)
            g = base_color[1] + rng.randint(-color_variance, color_variance)
            b = base_color[2] + rng.randint(-color_variance, color_variance)

            # Apply gradient
            r = int(r * (1 + gradient_x - gradient_y))
            g = int(g * (1 + gradient_y))
            b = int(b * (1 - gradient_x * 0.5))

            # Apply vignette
            r = int(r * vignette)
            g = int(g * vignette)
            b = int(b * vignette)

            # Add noise
            r += rng.randint(-noise_level, noise_level)
            g += rng.randint(-noise_level, noise_level)
            b += rng.randint(-noise_level, noise_level)

            # Clamp to valid range
            r = max(0, min(255, r))
            g = max(0, min(255, g))
            b = max(0, min(255, b))

            pixels[x, y] = (r, g, b)

    # Apply slight Gaussian blur to simulate optical properties
    img = img.filter(ImageFilter.GaussianBlur(radius=1.5))

    # Draw a subtle circular border (petri dish edge)
    draw = ImageDraw.Draw(img)
    border_radius = min(width, height) // 2 - 10
    draw.ellipse(
        [
            center_x - border_radius,
            center_y - border_radius,
            center_x + border_radius,
            center_y + border_radius,
        ],
        outline=(80, 80, 80),
        width=2,
    )

    return img


def generate_dataset():
    """Generates the complete synthetic dataset with labels."""
    random.seed(RANDOM_SEED)

    print("=" * 60)
    print("🫒 Zaytoun Vision — Synthetic Dataset Generator")
    print("=" * 60)
    print(f"Output directory: {DATASET_DIR}")
    print(f"Image size: {IMAGE_SIZE[0]}x{IMAGE_SIZE[1]}")
    print(f"Images per class: {IMAGES_PER_CLASS}")
    print()

    # Create output directories
    DATASET_DIR.mkdir(parents=True, exist_ok=True)
    labels = []

    for class_name, config in CLASS_CONFIG.items():
        class_dir = DATASET_DIR / class_name
        class_dir.mkdir(parents=True, exist_ok=True)

        print(f"📁 Generating: {class_name}")
        print(f"   {config['description']}")

        for i in range(IMAGES_PER_CLASS):
            # Select a random base color from the class palette
            base_color = random.choice(config["base_colors"])

            # Generate the image with a unique seed for reproducibility
            seed = hash(f"{class_name}_{i}") & 0xFFFFFFFF
            img = generate_fluorescence_image(
                base_color=base_color,
                color_variance=config["color_variance"],
                noise_level=config["noise_level"],
                saturation_range=config["saturation_range"],
                gradient_strength=config["gradient_strength"],
                seed=seed,
            )

            # Save the image
            filename = f"{class_name}_{i:04d}.jpg"
            filepath = class_dir / filename
            img.save(filepath, "JPEG", quality=95)

            # Add to labels
            labels.append({
                "filename": f"{class_name}/{filename}",
                "class": class_name,
                "index": i,
            })

            # Progress indicator
            if (i + 1) % 25 == 0:
                print(f"   ✅ {i + 1}/{IMAGES_PER_CLASS} images generated")

        print()

    # Write labels.csv
    labels_path = DATASET_DIR / "labels.csv"
    with open(labels_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["filename", "class", "index"])
        writer.writeheader()
        writer.writerows(labels)

    # Summary
    total_images = len(labels)
    print("=" * 60)
    print(f"✅ Dataset generation complete!")
    print(f"   Total images: {total_images}")
    print(f"   Labels file:  {labels_path}")
    print(f"   Classes:      {', '.join(CLASS_CONFIG.keys())}")
    print()
    print("Next steps:")
    print("  1. Upload to Azure Custom Vision portal")
    print("  2. Tag images by folder name (class)")
    print("  3. Train the model (Quick Training is fine)")
    print("  4. Publish the iteration")
    print("  5. Copy the prediction URL and key to .env")
    print("=" * 60)


if __name__ == "__main__":
    generate_dataset()
