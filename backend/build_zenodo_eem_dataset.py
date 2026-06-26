import argparse
import csv
import json
import re
import zipfile
from pathlib import Path
from urllib.request import urlretrieve

import numpy as np


ZENODO_RECORD_URL = "https://zenodo.org/api/records/19755088/files/data.zip/content"
BASE_DIR = Path(__file__).resolve().parents[1]
DEFAULT_ZIP_PATH = BASE_DIR / "data" / "external" / "zenodo_19755088" / "data.zip"
DEFAULT_OUTPUT_PATH = BASE_DIR / "data" / "processed" / "zenodo_eem_adulteration_features.csv"

SYSTEM_MAP = {
    "伯爵特级初榨混西王玉米胚芽油": ("borges_evoo", "corn_germ_oil"),
    "伯爵特级初榨混金龙鱼菜籽油": ("borges_evoo", "rapeseed_oil"),
    "欧丽薇兰特级初榨混家香味花生油": ("olivoila_evoo", "peanut_oil"),
    "欧丽薇兰特级初榨混福临门大豆油": ("olivoila_evoo", "soybean_oil"),
    "欧丽薇兰特级初榨混西王玉米胚芽油": ("olivoila_evoo", "corn_germ_oil"),
    "欧丽薇兰特级初榨混金龙鱼菜籽油": ("olivoila_evoo", "rapeseed_oil"),
    "鲁花特级初榨混家乡味花生油": ("luhua_evoo", "peanut_oil"),
    "鲁花特级初榨混晟麦核桃油": ("luhua_evoo", "walnut_oil"),
    "鲁花特级初榨混福临门大豆油": ("luhua_evoo", "soybean_oil"),
    "鲁花特级初榨混西王玉米胚芽油": ("luhua_evoo", "corn_germ_oil"),
    "鲁花特级初榨混金龙鱼菜籽油": ("luhua_evoo", "rapeseed_oil"),
}

ROUND_MAP = {
    "第一轮": 1,
    "第二轮": 2,
    "第三轮": 3,
}


def download_archive(zip_path: Path) -> None:
    if zip_path.exists():
        return
    zip_path.parent.mkdir(parents=True, exist_ok=True)
    urlretrieve(ZENODO_RECORD_URL, zip_path)


def ratio_parts(ratio_text: str) -> tuple[int, int]:
    match = re.fullmatch(r"(\d+)[：:](\d+)", ratio_text)
    if not match:
        raise ValueError(f"Unsupported ratio folder: {ratio_text}")
    return int(match.group(1)), int(match.group(2))


def adulteration_class(olive_fraction_pct: float) -> str:
    if olive_fraction_pct >= 90:
        return "pure_evoo_proxy"
    if olive_fraction_pct >= 50:
        return "light_adulteration"
    return "heavy_adulteration"


def parse_dat_file(raw_text: str) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    lines = [line for line in raw_text.splitlines() if line.strip()]
    emission_wavelengths = np.asarray([float(value) for value in lines[0].split()[1:]], dtype=np.float32)

    excitation_wavelengths: list[float] = []
    rows: list[list[float]] = []
    for line in lines[3:]:
        values = line.split()
        if len(values) < 2:
            continue
        excitation_wavelengths.append(float(values[0]))
        rows.append([float(value) for value in values[1:]])

    matrix = np.asarray(rows, dtype=np.float32)
    return emission_wavelengths, np.asarray(excitation_wavelengths, dtype=np.float32), matrix


def band_values(
    matrix: np.ndarray,
    emission_wavelengths: np.ndarray,
    emission_min: float,
    emission_max: float,
    excitation_wavelengths: np.ndarray | None = None,
    excitation_min: float | None = None,
    excitation_max: float | None = None,
) -> np.ndarray:
    emission_mask = (emission_wavelengths >= emission_min) & (emission_wavelengths <= emission_max)
    values = matrix[:, emission_mask]
    if excitation_wavelengths is not None and excitation_min is not None and excitation_max is not None:
        excitation_mask = (excitation_wavelengths >= excitation_min) & (excitation_wavelengths <= excitation_max)
        values = values[excitation_mask, :]
    return np.clip(values, 0, None)


def mean_or_zero(values: np.ndarray) -> float:
    return float(np.mean(values)) if values.size else 0.0


def max_or_zero(values: np.ndarray) -> float:
    return float(np.max(values)) if values.size else 0.0


def feature_row(zip_name: str, raw_text: str) -> dict[str, object]:
    _, system_zh, round_zh, ratio_text, _ = zip_name.split("/")
    olive_brand, adulterant = SYSTEM_MAP.get(system_zh, ("unknown_evoo", "unknown_adulterant"))
    olive_parts, adulterant_parts = ratio_parts(ratio_text)
    olive_fraction_pct = olive_parts / (olive_parts + adulterant_parts) * 100

    emission_wavelengths, excitation_wavelengths, matrix = parse_dat_file(raw_text)
    positive_matrix = np.clip(matrix, 0, None)
    blue = band_values(matrix, emission_wavelengths, 430, 480)
    green = band_values(matrix, emission_wavelengths, 500, 560)
    red = band_values(matrix, emission_wavelengths, 600, 640)
    uv_red = band_values(matrix, emission_wavelengths, 600, 640, excitation_wavelengths, 300, 400)
    uv_blue = band_values(matrix, emission_wavelengths, 430, 480, excitation_wavelengths, 300, 400)
    visible = band_values(matrix, emission_wavelengths, 430, 640)

    red_mean = mean_or_zero(red)
    green_mean = mean_or_zero(green)
    blue_mean = mean_or_zero(blue)
    visible_total = float(np.sum(visible))

    return {
        "source_file": zip_name,
        "system_zh": system_zh,
        "olive_brand": olive_brand,
        "adulterant": adulterant,
        "round": ROUND_MAP.get(round_zh, 0),
        "ratio": ratio_text.replace("：", ":"),
        "olive_fraction_pct": round(olive_fraction_pct, 4),
        "adulteration_pct": round(100 - olive_fraction_pct, 4),
        "adulteration_class": adulteration_class(olive_fraction_pct),
        "eem_mean": mean_or_zero(positive_matrix),
        "eem_max": max_or_zero(positive_matrix),
        "eem_std": float(np.std(positive_matrix)),
        "eem_total": float(np.sum(positive_matrix)),
        "blue_430_480_mean": blue_mean,
        "blue_430_480_max": max_or_zero(blue),
        "green_500_560_mean": green_mean,
        "green_500_560_max": max_or_zero(green),
        "red_600_640_mean": red_mean,
        "red_600_640_max": max_or_zero(red),
        "uv_red_600_640_mean": mean_or_zero(uv_red),
        "uv_blue_430_480_mean": mean_or_zero(uv_blue),
        "visible_430_640_total": visible_total,
        "red_blue_ratio": red_mean / (blue_mean + 1e-6),
        "red_green_ratio": red_mean / (green_mean + 1e-6),
        "green_blue_ratio": green_mean / (blue_mean + 1e-6),
        "red_visible_fraction": float(np.sum(red)) / (visible_total + 1e-6),
    }


def build_dataset(zip_path: Path, output_path: Path) -> dict[str, object]:
    download_archive(zip_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    rows = []
    with zipfile.ZipFile(zip_path) as archive:
        for zip_name in archive.namelist():
            if not zip_name.endswith("/0_RM.dat"):
                continue
            raw_text = archive.read(zip_name).decode("utf-8", errors="replace")
            rows.append(feature_row(zip_name, raw_text))

    if not rows:
        raise RuntimeError(f"No 0_RM.dat files found in {zip_path}")

    with output_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    class_counts: dict[str, int] = {}
    for row in rows:
        label = str(row["adulteration_class"])
        class_counts[label] = class_counts.get(label, 0) + 1

    return {
        "output": str(output_path),
        "rows": len(rows),
        "class_counts": class_counts,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build EEM adulteration features from the Zenodo olive oil dataset.")
    parser.add_argument("--zip-path", type=Path, default=DEFAULT_ZIP_PATH)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT_PATH)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    print(json.dumps(build_dataset(args.zip_path, args.output), indent=2))


if __name__ == "__main__":
    main()
