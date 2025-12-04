"""
Aggregation Module
Aggregates validated responses into optimal final time and plan
"""

import json
from typing import Dict, List, Any

class Aggregator:
    def __init__(self):
        self.min_participants = 1
        self.min_overlap_minutes = 30  # Minimum overlap for a valid time slot
    
    def aggregate(self, qc_output: Dict[str, Any]) -> Dict[str, Any]:
        """
        Aggregate validated entries into optimal time slots
        
        Input format:
        {
            "validated_entries": [
                {
                    "user_id": "U123",
                    "user_name": "John Doe",
                    "clean_slots": [
                        {"start": "19:00", "end": "23:00"},
                        {"start": "08:00", "end": "12:00"}
                    ],
                    "status": "valid"
                }
            ],
            "flagged_entries": []
        }
        
        Output format:
        {
            "optimal_times": [
                {
                    "start": "19:00",
                    "end": "21:00",
                    "participants": ["U123", "U456"],
                    "participant_names": ["John Doe", "Jane Smith"],
                    "confidence": 0.85
                }
            ],
            "participant_count": 2,
            "response_rate": 1.0,
            "status": "active"
        }
        """
        validated_entries = qc_output.get("validated_entries", [])
        
        if len(validated_entries) == 0:
            return {
                "optimal_times": [],
                "participant_count": 0,
                "response_rate": 0.0,
                "status": "active"
            }
        
        # Collect all time slots with participants
        all_slots = []
        participant_ids = set()
        participant_names = {}
        
        for entry in validated_entries:
            user_id = entry["user_id"]
            user_name = entry.get("user_name", user_id)
            participant_ids.add(user_id)
            participant_names[user_id] = user_name
            
            for slot in entry.get("clean_slots", []):
                all_slots.append({
                    "user_id": user_id,
                    "user_name": user_name,
                    "start": slot["start"],
                    "end": slot["end"]
                })
        
        # Find overlapping time slots
        optimal_times = self._find_optimal_overlaps(all_slots, list(participant_ids), participant_names)
        
        # Sort by participant count and confidence
        optimal_times.sort(key=lambda x: (len(x["participants"]), x["confidence"]), reverse=True)
        
        # Calculate response rate
        participant_count = len(participant_ids)
        response_rate = 1.0 if participant_count > 0 else 0.0
        
        return {
            "optimal_times": optimal_times,
            "participant_count": participant_count,
            "response_rate": response_rate,
            "status": "active"
        }
    
    def _find_optimal_overlaps(self, slots: List[Dict[str, Any]], all_participants: List[str], participant_names: Dict[str, str]) -> List[Dict[str, Any]]:
        """
        Find optimal overlapping time slots
        """
        if len(slots) == 0:
            return []
        
        # Convert time strings to minutes for easier comparison
        time_slots = []
        for slot in slots:
            start_min = self._time_to_minutes(slot["start"])
            end_min = self._time_to_minutes(slot["end"])
            time_slots.append({
                "user_id": slot["user_id"],
                "user_name": slot["user_name"],
                "start_min": start_min,
                "end_min": end_min,
                "start": slot["start"],
                "end": slot["end"]
            })
        
        # Find all intersections
        intersections = []
        
        for i, slot1 in enumerate(time_slots):
            for j, slot2 in enumerate(time_slots):
                if i >= j or slot1["user_id"] == slot2["user_id"]:
                    continue
                
                # Find overlap
                overlap_start = max(slot1["start_min"], slot2["start_min"])
                overlap_end = min(slot1["end_min"], slot2["end_min"])
                
                if overlap_end > overlap_start:
                    overlap_minutes = overlap_end - overlap_start
                    
                    if overlap_minutes >= self.min_overlap_minutes:
                        # Found a valid overlap
                        participants = {slot1["user_id"], slot2["user_id"]}
                        participant_names_list = [slot1["user_name"], slot2["user_name"]]
                        
                        # Convert back to time strings
                        overlap_start_str = self._minutes_to_time(overlap_start)
                        overlap_end_str = self._minutes_to_time(overlap_end)
                        
                        intersections.append({
                            "start": overlap_start_str,
                            "end": overlap_end_str,
                            "participants": list(participants),
                            "participant_names": participant_names_list,
                            "overlap_minutes": overlap_minutes
                        })
        
        # Merge overlapping intersections
        merged = self._merge_intersections(intersections, participant_names)
        
        # Calculate confidence for each merged slot
        optimal_times = []
        total_participants = len(all_participants)
        
        for merged_slot in merged:
            participant_count = len(merged_slot["participants"])
            confidence = participant_count / total_participants if total_participants > 0 else 0.0
            
            optimal_times.append({
                "start": merged_slot["start"],
                "end": merged_slot["end"],
                "participants": merged_slot["participants"],
                "participant_names": merged_slot["participant_names"],
                "confidence": round(confidence, 2)
            })
        
        return optimal_times
    
    def _merge_intersections(self, intersections: List[Dict[str, Any]], participant_names: Dict[str, str]) -> List[Dict[str, Any]]:
        """
        Merge overlapping intersections
        """
        if len(intersections) == 0:
            return []
        
        # Sort by start time
        sorted_intersections = sorted(intersections, key=lambda x: x["start"])
        merged = []
        
        for inter in sorted_intersections:
            if len(merged) == 0:
                merged.append(inter)
            else:
                last = merged[-1]
                
                # Check if they overlap or are adjacent
                last_end_min = self._time_to_minutes(last["end"])
                inter_start_min = self._time_to_minutes(inter["start"])
                
                if inter_start_min <= last_end_min:
                    # Merge: extend end time and combine participants
                    last["end"] = max(last["end"], inter["end"], key=lambda t: self._time_to_minutes(t))
                    last["participants"] = list(set(last["participants"] + inter["participants"]))
                    last["participant_names"] = list(set(last["participant_names"] + inter["participant_names"]))
                else:
                    merged.append(inter)
        
        return merged
    
    def _time_to_minutes(self, time_str: str) -> int:
        """Convert HH:MM to minutes since midnight"""
        parts = time_str.split(":")
        return int(parts[0]) * 60 + int(parts[1])
    
    def _minutes_to_time(self, minutes: int) -> str:
        """Convert minutes since midnight to HH:MM"""
        hours = minutes // 60
        mins = minutes % 60
        return f"{hours:02d}:{mins:02d}"


def process_aggregation(input_file: str, output_file: str):
    """
    Process aggregation from QC output file
    """
    with open(input_file, 'r') as json_file:
        qc_output = json.load(json_file)
    
    aggregator = Aggregator()
    result = aggregator.aggregate(qc_output)
    
    with open(output_file, 'w') as f:
        json.dump(result, f, indent=2)
    
    return result


if __name__ == "__main__":
    import sys
    if len(sys.argv) != 3:
        print("Usage: python aggregate.py <qc_output_file> <output_file>")
        sys.exit(1)
    
    process_aggregation(sys.argv[1], sys.argv[2])

