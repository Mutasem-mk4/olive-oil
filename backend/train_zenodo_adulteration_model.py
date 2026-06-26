import argparse
import csv
import json
import pickle
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from sklearn.base import clone
from sklearn.ensemble import (
    ExtraTreesClassifier,
    HistGradientBoostingClassifier,
    RandomForestClassifier,
    VotingClassifier,
)
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, balanced_accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.model_selection import StratifiedGroupKFold, StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
from xgboost import XGBClassifier


BASE_DIR = Path(__file__).resolve().parents[1]
DEFAULT_DATA_PATH = BASE_DIR / "data" / "processed" / "zenodo_eem_adulteration_features.csv"
DEFAULT_MODEL_PATH = Path(__file__).resolve().parent / "eem_adulteration_model.pkl"
DEFAULT_METRICS_PATH = Path(__file__).resolve().parent / "eem_adulteration_metrics.json"

TARGET_COLUMN = "adulteration_class"
GROUP_COLUMN = "system_zh"
IGNORED_COLUMNS = {
    "source_file",
    "system_zh",
    "olive_brand",
    "adulterant",
    "round",
    "ratio",
    "olive_fraction_pct",
    "adulteration_pct",
    TARGET_COLUMN,
}


def load_dataset(csv_path: Path) -> tuple[np.ndarray, np.ndarray, np.ndarray, list[str], list[str]]:
    with csv_path.open("r", encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))
    if not rows:
        raise ValueError(f"No rows found in {csv_path}")

    feature_names = [column for column in rows[0] if column not in IGNORED_COLUMNS]
    X = np.asarray([[float(row[name]) for name in feature_names] for row in rows], dtype=np.float32)
    y_labels = [row[TARGET_COLUMN] for row in rows]
    groups = np.asarray([row[GROUP_COLUMN] for row in rows])
    classes = sorted(set(y_labels))
    class_to_index = {label: index for index, label in enumerate(classes)}
    y = np.asarray([class_to_index[label] for label in y_labels], dtype=np.int64)
    return X, y, groups, feature_names, classes


def xgboost_model(num_classes: int) -> XGBClassifier:
    return XGBClassifier(
        objective="multi:softprob",
        num_class=num_classes,
        n_estimators=240,
        max_depth=3,
        learning_rate=0.04,
        subsample=0.9,
        colsample_bytree=0.9,
        reg_lambda=1.2,
        eval_metric="mlogloss",
        tree_method="hist",
        random_state=42,
        n_jobs=-1,
    )


def model_candidates(num_classes: int) -> dict[str, object]:
    xgboost = xgboost_model(num_classes)
    extra_trees = ExtraTreesClassifier(
        n_estimators=800,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    random_forest = RandomForestClassifier(
        n_estimators=800,
        max_depth=8,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    hist_gradient_boosting = HistGradientBoostingClassifier(
        max_iter=300,
        learning_rate=0.04,
        l2_regularization=0.1,
        random_state=42,
    )
    svm_rbf = make_pipeline(
        StandardScaler(),
        SVC(C=4.0, kernel="rbf", probability=True, class_weight="balanced", random_state=42),
    )
    logistic_regression = make_pipeline(
        StandardScaler(),
        LogisticRegression(C=1.0, max_iter=2000, class_weight="balanced", random_state=42),
    )

    return {
        "xgboost": xgboost,
        "extra_trees": extra_trees,
        "random_forest": random_forest,
        "hist_gradient_boosting": hist_gradient_boosting,
        "svm_rbf": svm_rbf,
        "logistic_regression": logistic_regression,
        "vote_xgboost_extra_trees_svm": VotingClassifier(
            estimators=[("xgboost", xgboost), ("extra_trees", extra_trees), ("svm_rbf", svm_rbf)],
            voting="soft",
        ),
        "vote_xgboost_logistic_histgb": VotingClassifier(
            estimators=[
                ("xgboost", xgboost),
                ("logistic_regression", logistic_regression),
                ("hist_gradient_boosting", hist_gradient_boosting),
            ],
            voting="soft",
        ),
    }


def cross_validation_scores(
    candidates: dict[str, object],
    X: np.ndarray,
    y: np.ndarray,
    groups: np.ndarray,
) -> dict[str, dict[str, float | list[float]]]:
    group_cv = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=42)
    scores: dict[str, dict[str, float | list[float]]] = {}
    for model_name, estimator in candidates.items():
        fold_scores = cross_val_score(
            estimator,
            X,
            y,
            groups=groups,
            cv=group_cv,
            scoring="balanced_accuracy",
        )
        scores[model_name] = {
            "balanced_accuracy_mean": round(float(np.mean(fold_scores)), 4),
            "balanced_accuracy_std": round(float(np.std(fold_scores)), 4),
            "balanced_accuracy_scores": [round(float(score), 4) for score in fold_scores],
        }
    return scores


def best_candidate_name(scores: dict[str, dict[str, float | list[float]]]) -> str:
    return max(scores, key=lambda name: float(scores[name]["balanced_accuracy_mean"]))


def train(data_path: Path, model_path: Path, metrics_path: Path) -> dict:
    X, y, groups, feature_names, classes = load_dataset(data_path)
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.25,
        random_state=42,
        stratify=y,
    )

    candidates = model_candidates(num_classes=len(classes))
    group_scores = cross_validation_scores(candidates, X, y, groups)
    selected_model_name = best_candidate_name(group_scores)

    holdout_estimator = clone(candidates[selected_model_name])
    holdout_estimator.fit(X_train, y_train)
    y_pred = holdout_estimator.predict(X_test)

    random_cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    random_cv_scores = cross_val_score(
        candidates[selected_model_name],
        X,
        y,
        cv=random_cv,
        scoring="balanced_accuracy",
    )

    final_model = clone(candidates[selected_model_name])
    final_model.fit(X, y)

    y_test_labels = [classes[index] for index in y_test]
    y_pred_labels = [classes[index] for index in y_pred]
    metrics = {
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "data_path": str(data_path),
        "task": "public_eem_adulteration_classification",
        "target": TARGET_COLUMN,
        "selected_model": selected_model_name,
        "model_type": type(final_model).__name__,
        "row_count": int(X.shape[0]),
        "feature_count": int(X.shape[1]),
        "feature_names": feature_names,
        "classes": classes,
        "class_distribution": {classes[label]: count for label, count in sorted(Counter(y).items())},
        "group_cross_validation": {
            "folds": 5,
            "group": GROUP_COLUMN,
            **group_scores[selected_model_name],
        },
        "random_cross_validation": {
            "folds": 5,
            "balanced_accuracy_mean": round(float(np.mean(random_cv_scores)), 4),
            "balanced_accuracy_std": round(float(np.std(random_cv_scores)), 4),
            "balanced_accuracy_scores": [round(float(score), 4) for score in random_cv_scores],
        },
        "candidate_models": group_scores,
        "holdout": {
            "test_size": int(X_test.shape[0]),
            "accuracy": round(float(accuracy_score(y_test_labels, y_pred_labels)), 4),
            "balanced_accuracy": round(float(balanced_accuracy_score(y_test_labels, y_pred_labels)), 4),
            "macro_f1": round(float(f1_score(y_test_labels, y_pred_labels, average="macro")), 4),
            "classification_report": classification_report(
                y_test_labels,
                y_pred_labels,
                labels=classes,
                output_dict=True,
                zero_division=0,
            ),
            "confusion_matrix": confusion_matrix(y_test_labels, y_pred_labels, labels=classes).tolist(),
        },
        "limitations": [
            "This model is trained on public spectrometer EEM matrices, not raw smartphone photos.",
            "The pure_evoo_proxy class represents the highest olive-oil ratio in the archive, not guaranteed 100% pure EVOO.",
            "Use blind camera photos under the project capture protocol before claiming field accuracy.",
        ],
    }

    with model_path.open("wb") as handle:
        pickle.dump({
            "model": final_model,
            "model_name": selected_model_name,
            "feature_names": feature_names,
            "classes": classes,
            "target": TARGET_COLUMN,
            "metrics": metrics,
        }, handle)

    with metrics_path.open("w", encoding="utf-8") as handle:
        json.dump(metrics, handle, indent=2)
        handle.write("\n")

    return metrics


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train adulteration classifier from Zenodo EEM feature data.")
    parser.add_argument("--data", type=Path, default=DEFAULT_DATA_PATH)
    parser.add_argument("--model-out", type=Path, default=DEFAULT_MODEL_PATH)
    parser.add_argument("--metrics-out", type=Path, default=DEFAULT_METRICS_PATH)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    metrics = train(args.data, args.model_out, args.metrics_out)
    print(json.dumps({
        "model": str(args.model_out),
        "metrics": str(args.metrics_out),
        "selected_model": metrics["selected_model"],
        "group_cv_balanced_accuracy": metrics["group_cross_validation"]["balanced_accuracy_mean"],
        "random_cv_balanced_accuracy": metrics["random_cross_validation"]["balanced_accuracy_mean"],
        "holdout_balanced_accuracy": metrics["holdout"]["balanced_accuracy"],
        "limitations": metrics["limitations"],
    }, indent=2))


if __name__ == "__main__":
    main()
