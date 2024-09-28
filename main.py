from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import fastf1
import numpy as np

app = FastAPI()

# Add CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Adjust this to your frontend's address
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/events/{year}")
async def get_events(year: int): 
    # Enable FastF1 cache
    fastf1.Cache.enable_cache("C:/Users/acer/F1 cache")

    # Fetch the event schedule for the given year
    schedule = fastf1.get_event_schedule(year)

    # Create a list of events with their names and round numbers
    event_list = [{"EventName": event.EventName, "RoundNumber": event.RoundNumber} for event in schedule.itertuples()]

    return {"events": event_list}
# Endpoint to fetch track information (X, Y coordinates)
@app.get("/track/{year}/{event_name}")
async def get_track_info(year: int, event_name: str):
    try:
        fastf1.Cache.enable_cache("C:/Users/acer/F1 cache")
        schedule = fastf1.get_event_schedule(year)
        event = schedule.loc[schedule['EventName'] == event_name].iloc[0]
        session = fastf1.get_session(year, event['RoundNumber'], 'R')
        session.load()

        if session.laps.empty:
            raise Exception("No laps available in session")

        fastest_lap = session.laps.pick_fastest()
        pos_data = fastest_lap.get_pos_data()

        # No more rotation, return the track data as it is
        track_data = [{"X": float(x), "Y": float(y)} for x, y in pos_data[['X', 'Y']].to_numpy()]

        return {"track": track_data}
    
    except Exception as e:
        print(f"Error fetching track info: {str(e)}")
        return {"error": "Failed to load track info"}, 500



# Endpoint to fetch driver position data
@app.get("/race/{year}/{event_name}/positions")
async def get_driver_positions(year: int, event_name: str):
    try:
        # Enable FastF1 cache
        fastf1.Cache.enable_cache("C:/Users/acer/F1 cache")
        
        # Fetch the event and load the race session
        schedule = fastf1.get_event_schedule(year)
        event = schedule.loc[schedule['EventName'] == event_name].iloc[0]
        
        session = fastf1.get_session(year, event['RoundNumber'], 'R')
        session.load()

        # Get driver position data
        position_data = session.pos_data
        # print(position_data)

        # Format the position data to send to the frontend
        driver_positions = {}
        for driver_num, pos_df in position_data.items():
            positions = pos_df[['X', 'Y', 'SessionTime']].to_dict(orient='records')
            driver_positions[driver_num] = positions

        return {"positions": driver_positions}

    except Exception as e:
        print(f"Error fetching driver positions: {str(e)}")
        return {"error": "Failed to load driver positions"}, 500
    
# Endpoint to fetch driver abbreviations
@app.get("/race/{year}/{event_name}/drivers")
async def get_driver_abbreviations(year: int, event_name: str):
    try:
        # Enable FastF1 cache
        fastf1.Cache.enable_cache("C:/Users/acer/F1 cache")
        
        # Fetch the event and load the race session
        schedule = fastf1.get_event_schedule(year)
        event = schedule.loc[schedule['EventName'] == event_name].iloc[0]
        
        session = fastf1.get_session(year, event['RoundNumber'], 'R')
        session.load()

        # Get driver abbreviations
        driver_abbreviations = {}
        for driver_num in session.drivers:
            driver_info = session.get_driver(driver_num)
            driver_abbreviations[driver_num] = driver_info.Abbreviation

        return {"drivers": driver_abbreviations}
    
    except Exception as e:
        print(f"Error fetching driver abbreviations: {str(e)}")
        return {"error": "Failed to load driver abbreviations"}, 500




# WebSocket for real-time updates
@app.websocket("/ws/race/{year}/{event_name}")
async def websocket_driver_positions(websocket: WebSocket, year: int, event_name: str):
    await websocket.accept()

    # Fetch event schedule and load the race session
    schedule = fastf1.get_event_schedule(year)
    event = schedule.loc[schedule['EventName'] == event_name].iloc[0]

    session = fastf1.get_session(year, event['RoundNumber'], 'R')
    session.load()

    # Get driver position data
    position_data = session.pos_data
    drivers = position_data.keys()

    # Continuously send position updates
    while True:
        driver_positions = {}
        for driver_num in drivers:
            positions = position_data[driver_num][['X', 'Y', 'Time']].to_dict(orient='records')
            driver_positions[driver_num] = positions
        
        await websocket.send_json(driver_positions)