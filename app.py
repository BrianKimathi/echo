import websocket
import json

# PUT YOUR API TOKEN HERE
TOKEN = "pat_828d2f465273b6754af4dc410383f2a704e17c160403bade666d848109e0fd50"

# Deriv App ID
APP_ID = "1089"


def on_open(ws):
    print("Connected to Deriv.")

    ws.send(json.dumps({
        "authorize": TOKEN
    }))


def on_message(ws, message):
    data = json.loads(message)

    if "authorize" in data:
        print("Authorization successful!")
        print("Login ID:", data["authorize"]["loginid"])

        ws.send(json.dumps({
            "ticks": "R_100",
            "subscribe": 1
        }))

    elif "tick" in data:
        quote = str(data["tick"]["quote"])
        last_digit = quote[-1]
        print("Tick:", quote, "| Last Digit:", last_digit)

    elif "error" in data:
        print("Error:", data["error"]["message"])


def on_error(ws, error):
    print("WebSocket Error:", error)


def on_close(ws, close_status_code, close_msg):
    print("Connection closed.")


ws = websocket.WebSocketApp(
    f"wss://ws.derivws.com/websockets/v3?app_id={APP_ID}",
    on_open=on_open,
    on_message=on_message,
    on_error=on_error,
    on_close=on_close
)

ws.run_forever()