# sync

## Project Overview and Goals
This project aims to build a modular crowd-powered system that collects worker responses, applies quality control (QC) checks, and aggregates results into final outputs. The primary goals are to ensure reliable, high-quality responses from workers, implement automated QC checks to flag low-quality submissions, aggregate validated responses into structured datasets, and provide a scalable pipeline for experiments and future expansion.

## Setup Instructions
### 1. Install dependencies 
''' 
pip install -r requirements.txt 
'''

## How to Run

## Project Breakdown
### 1. Data
You can find our data in the data folder, which contains raw and processed data subfolders. Following these folders, you can track data as it moves through the project. 

### 2. QC 
You can find our QC module in src/QC. 

### 3. Aggregation 
You can find our aggregation module in src/Aggregation

## Data Format and Breakdown
### 1. Our Data Parser breaks down texts and prompts into simple JSON. 
Sample input: 
```
{
  "group_id": "g101",
  "messages": [
    {
      "user_id": "u123",
      "raw_message": "im good after 7 or anytime tmr morning",
      "parsed_slots": [
        {"start": "19:00", "end": "23:00", "conf": 0.88},
        {"start": "08:00", "end": "12:00", "conf": 0.74}
      ]
    }
  ]
}
```
Sample output: 
```
{
  "validated_entries": [
    {
      "user_id": "u123",
      "clean_slots": [
        {"start": "19:00", "end": "23:00"},
        {"start": "08:00", "end": "12:00"}
      ],
      "status": "valid"
    }
  ],
  "flagged_entries": []
}
```

## Team Member Contacts
- Ethan : ethanxia@seas.upenn.edu
- Omar : pareja@seas.upenn.edu
- Daniel : ytian27@wharton.upenn.edu
- Eshaan : ekaipa@seas.upenn.edu
- Hugo : songh8@sas.upenn.edu

## License Information
