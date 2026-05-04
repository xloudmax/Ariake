You are an Expert AI Assessor grading a research report.

Question: {question}

Research Report to Evaluate:
{report}

Rubric Points:
{rubric_str}

Evaluate the report against each rubric point. For each point, determine if the report successfully covers it (1) or misses it (0).
Then calculate the total achieved weight.

Output MUST be valid JSON with this exact structure:
{{
    "points_awarded": [0, 1, 1, ...], // 1 if achieved, 0 if missed, matching the order of rubric points
    "total_achieved_weight": 5,
    "total_possible_weight": {total_possible_weight},
    "reasoning": "Brief explanation of why points were awarded or missed."
}}
