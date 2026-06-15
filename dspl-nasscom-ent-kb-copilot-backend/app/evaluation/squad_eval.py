"""SQuAD-style evaluation for exact match and F1 scores."""

from typing import List, Dict, Any
import re
import string
from collections import Counter

def normalize_answer(s: str) -> str:
    """Lower case, remove punctuation, articles and extra whitespace."""
    def remove_articles(text):
        return re.sub(r'\b(a|an|the)\b', ' ', text)

    def white_space_fix(text):
        return ' '.join(text.split())

    def remove_punc(text):
        exclude = set(string.punctuation)
        return ''.join(ch for ch in text if ch not in exclude)

    def lower(text):
        return text.lower()

    return white_space_fix(remove_articles(remove_punc(lower(s))))

def f1_score(prediction: str, ground_truth: str) -> float:
    prediction_tokens = normalize_answer(prediction).split()
    ground_truth_tokens = normalize_answer(ground_truth).split()
    common = Counter(prediction_tokens) & Counter(ground_truth_tokens)
    num_same = sum(common.values())
    if num_same == 0:
        return 0
    precision = 1.0 * num_same / len(prediction_tokens)
    recall = 1.0 * num_same / len(ground_truth_tokens)
    f1 = (2 * precision * recall) / (precision + recall)
    return f1

def exact_match_score(prediction: str, ground_truth: str) -> bool:
    return normalize_answer(prediction) == normalize_answer(ground_truth)

def evaluate_squad(predictions: List[str], ground_truths: List[str]) -> Dict[str, float]:
    """
    Evaluate a list of predictions against ground truths using SQuAD metrics.
    """
    em_total = 0
    f1_total = 0
    
    for p, gt in zip(predictions, ground_truths):
        em_total += exact_match_score(p, gt)
        f1_total += f1_score(p, gt)
        
    count = len(predictions)
    return {
        "exact_match": 100.0 * em_total / count if count > 0 else 0,
        "f1": 100.0 * f1_total / count if count > 0 else 0,
    }
