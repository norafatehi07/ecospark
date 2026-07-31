import json
import csv
from datetime import datetime, timedelta

def generate_weekly_report(users_data_path, output_csv):
    """
    Simulates reading EcoSpark user data from the Firebase NoSQL database 
    and generating a weekly environmental impact report using Python.
    """
    print(f"[{datetime.now().isoformat()}] Starting EcoSpark Weekly Impact Analysis...")
    
    # Mock data that would normally come from Firebase Firestore
    mock_firebase_data = [
        {"username": "EcoWarrior22", "tasks_completed": 15, "co2_saved": 32.5, "water_saved": 120.0},
        {"username": "GreenStudent", "tasks_completed": 8, "co2_saved": 12.0, "water_saved": 45.0},
        {"username": "PlanetSaver", "tasks_completed": 21, "co2_saved": 45.2, "water_saved": 210.5},
        {"username": "NatureLover", "tasks_completed": 5, "co2_saved": 8.1, "water_saved": 10.0}
    ]
    
    total_co2 = sum(user['co2_saved'] for user in mock_firebase_data)
    total_water = sum(user['water_saved'] for user in mock_firebase_data)
    total_tasks = sum(user['tasks_completed'] for user in mock_firebase_data)
    
    print("\n--- WEEKLY SUMMARY ---")
    print(f"Total Eco-Tasks Completed: {total_tasks}")
    print(f"Total CO2 Prevented: {total_co2} kg")
    print(f"Total Water Saved: {total_water} liters")
    print("----------------------\n")
    
    # Write to a CSV report
    with open(output_csv, 'w', newline='') as file:
        writer = csv.writer(file)
        writer.writerow(["Username", "Tasks Completed", "CO2 Saved (kg)", "Water Saved (L)"])
        for user in mock_firebase_data:
            writer.writerow([user['username'], user['tasks_completed'], user['co2_saved'], user['water_saved']])
            
    print(f"Detailed report exported to: {output_csv}")

if __name__ == "__main__":
    report_filename = f"ecospark_impact_report_{datetime.now().strftime('%Y-%m-%d')}.csv"
    generate_weekly_report("firebase_users.json", report_filename)
