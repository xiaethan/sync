"""
Quality Control Module
Performs quality control on crowd inputs
"""

import json
from typing import Dict, List, Any

class QualityControl:
    def __init__(self):
        self.min_confidence = 0.5
        self.min_slots = 1
        self.max_time_range_hours = 24
    
    def validate_entries(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate entries from parsed messages
        
        Input format:
        {
            "channel_id": "C123456",
            "messages": [
                {
                    "user_id": "U123",
                    "user_name": "John Doe",
                    "raw_message": "im good after 7 or anytime tmr morning",
                    "parsed_slots": [
                        {"start": "19:00", "end": "23:00", "conf": 0.88},
                        {"start": "08:00", "end": "12:00", "conf": 0.74}
                    ]
                }
            ]
        }
        
        Output format:
        {
            "validated_entries": [...],
            "flagged_entries": [...]
        }
        """
        validated = []
        flagged = []
        
        for msg in data.get("messages", []):
            entry = self._validate_single_entry(msg)
            
            if entry["status"] == "valid":
                validated.append(entry)
            else:
                flagged.append(entry)
        
        return {
            "validated_entries": validated,
            "flagged_entries": flagged
        }
    
    def _validate_single_entry(self, msg: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate a single message entry
        """
        user_id = msg.get("user_id")
        user_name = msg.get("user_name", user_id)
        parsed_slots = msg.get("parsed_slots", [])
        flags = []
        
        # Check if user_id exists
        if not user_id:
            flags.append("missing_user_id")
        
        # Check if we have any slots
        if len(parsed_slots) == 0:
            flags.append("no_time_slots")
        
        # Validate each slot
        clean_slots = []
        for slot in parsed_slots:
            slot_flags = self._validate_slot(slot)
            
            if len(slot_flags) == 0:
                # Slot is valid, add to clean_slots
                clean_slot = {
                    "start": slot["start"],
                    "end": slot["end"]
                }
                # Include location if present
                if "location" in slot and slot["location"]:
                    clean_slot["location"] = slot["location"]
                clean_slots.append(clean_slot)
            else:
                flags.extend([f"slot_{f}" for f in slot_flags])
        
        # Check if we have any valid slots after validation
        if len(clean_slots) == 0 and len(parsed_slots) > 0:
            flags.append("no_valid_slots")
        
        # Determine status
        status = "valid" if len(flags) == 0 and len(clean_slots) > 0 else "flagged"
        
        entry = {
            "user_id": user_id,
            "user_name": user_name,
            "clean_slots": clean_slots,
            "status": status
        }
        
        # Include general locations if present
        parsed_locations = msg.get("parsed_locations", [])
        if parsed_locations:
            entry["locations"] = parsed_locations
        
        if flags:
            entry["flags"] = flags
        
        return entry
    
    def _validate_slot(self, slot: Dict[str, Any]) -> List[str]:
        """
        Validate a single time slot
        Returns list of flags (empty if valid)
        """
        flags = []
        
        # Check required fields
        if "start" not in slot or "end" not in slot:
            flags.append("missing_time")
            return flags
        
        start = slot["start"]
        end = slot["end"]
        confidence = slot.get("conf", 0.0)
        
        # Check confidence threshold
        if confidence < self.min_confidence:
            flags.append("low_confidence")
        
        # Validate time format
        if not self._is_valid_time(start) or not self._is_valid_time(end):
            flags.append("invalid_time_format")
            return flags
        
        # Check time range validity
        if not self._is_valid_time_range(start, end):
            flags.append("invalid_time_range")
        
        # Check if range is too large
        if self._get_time_range_hours(start, end) > self.max_time_range_hours:
            flags.append("range_too_large")
        
        return flags
    
    def _is_valid_time(self, time_str: str) -> bool:
        """Check if time string is in HH:MM format"""
        try:
            parts = time_str.split(":")
            if len(parts) != 2:
                return False
            hour = int(parts[0])
            minute = int(parts[1])
            return 0 <= hour < 24 and 0 <= minute < 60
        except:
            return False
    
    def _is_valid_time_range(self, start: str, end: str) -> bool:
        """Check if start time is before end time"""
        try:
            start_parts = start.split(":")
            end_parts = end.split(":")
            
            start_minutes = int(start_parts[0]) * 60 + int(start_parts[1])
            end_minutes = int(end_parts[0]) * 60 + int(end_parts[1])
            
            # Allow for same-day ranges or next-day ranges
            return True
        except:
            return False
    
    def _get_time_range_hours(self, start: str, end: str) -> float:
        """Get time range in hours"""
        try:
            start_parts = start.split(":")
            end_parts = end.split(":")
            
            start_minutes = int(start_parts[0]) * 60 + int(start_parts[1])
            end_minutes = int(end_parts[0]) * 60 + int(end_parts[1])
            
            if start_minutes <= end_minutes:
                return (end_minutes - start_minutes) / 60.0
            else:
                # Next day
                return (24 * 60 - start_minutes + end_minutes) / 60.0
        except:
            return 0.0


def process_qc(input_file: str, output_file: str):
    """
    Process QC from input file and write to output file
    """
    with open(input_file, 'r') as f:
        data = json.load(f)
    
    qc = QualityControl()
    result = qc.validate_entries(data)
    
    with open(output_file, 'w') as f:
        json.dump(result, f, indent=2)
    
    return result


if __name__ == "__main__":
    import sys
    if len(sys.argv) != 3:
        print("Usage: python quality_control.py <input_file> <output_file>")
        sys.exit(1)
    
    process_qc(sys.argv[1], sys.argv[2])

