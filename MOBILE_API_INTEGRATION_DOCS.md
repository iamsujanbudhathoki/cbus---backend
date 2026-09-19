# College Bus Tracking System - Mobile Developer Integration Guide
**Roles Covered:** Driver App & Parent App  
**Protocol:** REST API (JSON) + Real-Time WebSocket (Socket.IO v4)  
**Security Model:** Multi-Tenant Role-Based Access Control (RBAC)  

---

## 1. Architecture & Connection Overview

### 1.1 Base URLs
| Environment | REST API Base URL | WebSocket Server URL |
| :--- | :--- | :--- |
| **Local Development** | `http://<YOUR_DEV_MACHINE_IP>:5000` | `http://<YOUR_DEV_MACHINE_IP>:5000` |
| **Android Emulator** | `http://10.0.2.2:5000` | `http://10.0.2.2:5000` |
| **iOS Simulator** | `http://localhost:5000` | `http://localhost:5000` |
| **Staging / Production** | `https://api.yourdomain.com` | `https://api.yourdomain.com` |

> [!IMPORTANT]
> When testing on a physical mobile device, replace `localhost` with your development machine's local IP address (e.g., `http://192.168.1.100:5000`). Ensure your mobile device and development machine are connected to the same Wi-Fi network.

---

### 1.2 Authentication Standards
All authenticated requests must include the JWT token obtained from `/api/v1/auth/login`:
- **REST Endpoints:** Pass HTTP header:
  ```http
  Authorization: Bearer <YOUR_JWT_TOKEN>
  Content-Type: application/json
  ```
- **Socket.IO Connection:** Pass the token in the `auth` handshake object:
  ```javascript
  {
    transports: ['websocket'],
    auth: {
      token: '<YOUR_JWT_TOKEN>'
    }
  }
  ```

---

## 2. Common Authentication API

### 2.1 User Login
*Used by both Driver and Parent to obtain an access token and user identity.*

- **Method / Endpoint:** `POST /api/v1/auth/login`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "email": "driver@college.edu",
    "password": "SecurePassword123"
  }
  ```
- **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "user": {
        "id": "c62b9a71-8b3c-4d22-bcf5-123456789abc",
        "email": "driver@college.edu",
        "name": "Ram Bahadur",
        "role": "DRIVER",
        "collegeId": "8f3b2a10-4c5d-6e7f-8a9b-0123456789de",
        "status": "ACTIVE"
      },
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
  ```

> [!TIP]
> 1. Store `data.token` securely on the device (e.g., `FlutterSecureStorage` or `react-native-keychain`).
> 2. Store `data.user.id` and `data.user.role` to determine the initial app navigation route (`DRIVER` vs `PARENT`).

---

### 2.2 Get Current Session (`/me`)
*Verifies token validity and restores user profile on app launch.*

- **Method / Endpoint:** `GET /api/v1/auth/me`
- **Headers:** `Authorization: Bearer <YOUR_JWT_TOKEN>`
- **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "User profile fetched successfully",
    "data": {
      "id": "c62b9a71-8b3c-4d22-bcf5-123456789abc",
      "email": "driver@college.edu",
      "name": "Ram Bahadur",
      "role": "DRIVER",
      "collegeId": "8f3b2a10-4c5d-6e7f-8a9b-0123456789de"
    }
  }
  ```

---

## 3. Driver App Implementation

The Driver App is responsible for:
1. Fetching driver vehicle assignment & scheduled route.
2. Starting a driving shift with current device GPS coordinates.
3. Streaming live GPS location packets over WebSocket every 2–3 seconds while moving (and 5s heartbeat when stationary).
4. Ending the shift when done.

```
+-------------------------------------------------------------+
|                     DRIVER APP WORKFLOW                     |
+-------------------------------------------------------------+
   1. POST /api/v1/auth/login        --> Get JWT Token & User ID
   2. GET  /api/v1/driver-shifts/portal --> Get Bus ID, Route & Active Shift
   3. POST /api/v1/driver-shifts/start  --> Start Shift with initial GPS
   4. Socket.IO Connect              --> auth: { token }
   5. Loop: emit('bus:location_update')--> High-frequency GPS stream
   6. POST /api/v1/driver-shifts/{id}/end--> Complete shift & emit OFFLINE
```

---

### 3.1 Get Driver Portal Data
*Fetches the driver's assigned bus, assigned route stops, and any active ongoing shift.*

- **Method / Endpoint:** `GET /api/v1/driver-shifts/portal`
- **Headers:** `Authorization: Bearer <YOUR_JWT_TOKEN>`
- **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Driver portal data fetched",
    "data": {
      "driver": {
        "id": "d10a2b3c-4d5e-6f7a-8b9c-0123456789ab",
        "licenseNumber": "DL-987654321",
        "phone": "+9779812345678"
      },
      "bus": {
        "id": "b51a1111-2222-3333-4444-555566667777",
        "busNumber": "B-12",
        "vehicleNumber": "BA 2 KHA 4567",
        "status": "IDLE"
      },
      "route": {
        "id": "r99a1111-2222-3333-4444-555566667777",
        "name": "Route 4 - City Express",
        "stops": [
          {
            "id": "s11a1111-2222-3333-4444-555566667777",
            "name": "Koteshwor Chowk",
            "latitude": 27.6754,
            "longitude": 85.3456,
            "sequence": 1
          },
          {
            "id": "s22a1111-2222-3333-4444-555566667777",
            "name": "Baneshwor",
            "latitude": 27.6915,
            "longitude": 85.3342,
            "sequence": 2
          }
        ]
      },
      "activeShift": null
    }
  }
  ```

---

### 3.2 Start Driving Shift
*Initiates an active shift and marks the bus as active on tracking maps.*

- **Method / Endpoint:** `POST /api/v1/driver-shifts/start`
- **Headers:** `Authorization: Bearer <YOUR_JWT_TOKEN>`, `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "notes": "Morning pickup run",
    "latitude": 27.675412,
    "longitude": 85.345634,
    "speed": 0
  }
  ```
- **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Shift started successfully",
    "data": {
      "id": "shift-8888-9999-aaaa-bbbbccccdddd",
      "driverId": "d10a2b3c-4d5e-6f7a-8b9c-0123456789ab",
      "busId": "b51a1111-2222-3333-4444-555566667777",
      "collegeId": "8f3b2a10-4c5d-6e7f-8a9b-0123456789de",
      "status": "ONGOING",
      "startedAt": "2026-09-19T06:30:00.000Z",
      "notes": "Morning pickup run"
    }
  }
  ```

---

### 3.3 Stream Live GPS Coordinates (WebSocket)

Connect to Socket.IO and emit `bus:location_update`.

#### Socket Initialization:
```javascript
import { io } from "socket.io-client";

const socket = io("http://<SERVER_HOST>:5000", {
  transports: ["websocket"],
  auth: {
    token: userToken, // JWT token from login
  },
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
});
```

#### Event: `bus:location_update` (Client -> Server)
Emit this event whenever the device's GPS position updates:
```json
{
  "busId": "b51a1111-2222-3333-4444-555566667777",
  "latitude": 27.676123,
  "longitude": 85.346789,
  "speed": 28.5,
  "heading": 85.2,
  "status": "MOVING"
}
```

#### Payload Field Reference:
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `busId` | `string` | **Yes** | UUID of the assigned bus. |
| `latitude` | `number` | **Yes** | Device GPS latitude between `-90.0` and `90.0`. |
| `longitude` | `number` | **Yes** | Device GPS longitude between `-180.0` and `180.0`. |
| `speed` | `number` | No | Current vehicle speed in km/h (default: `0`). |
| `heading` | `number` | No | Compass bearing direction in degrees (`0` to `360`). |
| `status` | `string` | No | Enum: `"MOVING"`, `"IDLE"`, or `"OFFLINE"`. |

> [!NOTE]
> **Throttling Recommendation:**
> - **Moving (`speed > 0`):** Emit every **2 to 3 seconds** or when the bus moves more than **5 meters**.
> - **Stationary (`speed == 0`):** Emit a heartbeat packet every **5 to 8 seconds** to keep tracking status `"LIVE"`.

---

### 3.4 Fallback REST Location Update (HTTP)
*Use this endpoint only if the device loses WebSocket connectivity.*

- **Method / Endpoint:** `POST /api/v1/tracking/update-location`
- **Headers:** `Authorization: Bearer <YOUR_JWT_TOKEN>`, `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "busId": "b51a1111-2222-3333-4444-555566667777",
    "latitude": 27.676123,
    "longitude": 85.346789,
    "speed": 28.5,
    "heading": 85.2
  }
  ```

---

### 3.5 Update Shift Notes (Optional)
*Allows the driver to append operational notes (e.g., "Heavy traffic at Koteshwor").*

- **Method / Endpoint:** `PUT /api/v1/driver-shifts/{shiftId}/notes`
- **Headers:** `Authorization: Bearer <YOUR_JWT_TOKEN>`, `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "notes": "Route completed, 15 min delay due to road maintenance."
  }
  ```

---

### 3.6 End Shift
*Ends the driving shift, records completion time, and marks the bus status offline.*

1. **Emit final WebSocket update (Sets bus status offline immediately):**
   ```javascript
   socket.emit("bus:location_update", {
     busId: assignedBusId,
     latitude: lastLatitude,
     longitude: lastLongitude,
     speed: 0,
     heading: 0,
     status: "OFFLINE"
   });
   ```

2. **Call REST API to persist shift completion:**
   - **Method / Endpoint:** `POST /api/v1/driver-shifts/{shiftId}/end`
   - **Headers:** `Authorization: Bearer <YOUR_JWT_TOKEN>`
   - **Success Response (`200 OK`):**
     ```json
     {
       "success": true,
       "message": "Shift completed successfully",
       "data": {
         "id": "shift-8888-9999-aaaa-bbbbccccdddd",
         "status": "COMPLETED",
         "endedAt": "2026-09-19T09:15:00.000Z"
       }
     }
     ```

---

## 4. Parent App Implementation

The Parent App is responsible for:
1. Fetching all children linked to this parent account.
2. Identifying which bus is assigned to each child.
3. Fetching initial bus status and route stops via REST API.
4. Subscribing to real-time live GPS coordinates via WebSocket (`join:bus`).
5. Showing live moving bus marker and route on a map.

```
+-------------------------------------------------------------+
|                     PARENT APP WORKFLOW                     |
+-------------------------------------------------------------+
   1. POST /api/v1/auth/login             --> Get JWT Token & User ID
   2. GET  /api/v1/parents/user/{userId}  --> Get Linked Children & Assigned Bus IDs
   3. GET  /api/v1/parents/user/{userId}/live-location --> Quick snapshot of all children's buses
   4. Socket.IO Connect                   --> auth: { token }
   5. socket.emit('join:bus', { busId })  --> Join real-time room for selected bus
   6. socket.on('bus:location', callback) --> Live map updates (lat, lng, speed, heading)
   7. socket.on('bus:status', callback)   --> Live status badges ('MOVING', 'IDLE', 'OFFLINE')
   8. socket.emit('leave:bus', { busId }) --> Unsubscribe when navigating away
```

---

### 4.1 Get Parent Details & Linked Children
*Retrieves all linked children, their schools, and their assigned bus and route.*

- **Method / Endpoint:** `GET /api/v1/parents/user/{userId}`
- **Headers:** `Authorization: Bearer <YOUR_JWT_TOKEN>`
- **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Parent profile fetched successfully",
    "data": {
      "id": "parent-1111-2222-3333-444455556666",
      "name": "Hari Prasad",
      "phone": "+9779841234567",
      "email": "parent@gmail.com",
      "children": [
        {
          "id": "student-aaaa-bbbb-cccc-ddddeeeeffff",
          "name": "Aarav Prasad",
          "rollNumber": "10-A",
          "grade": "10",
          "relationship": "Father",
          "assignedBus": {
            "id": "b51a1111-2222-3333-4444-555566667777",
            "busNumber": "B-12",
            "vehicleNumber": "BA 2 KHA 4567",
            "status": "MOVING",
            "assignedRoute": {
              "id": "r99a1111-2222-3333-4444-555566667777",
              "name": "Route 4 - City Express"
            }
          }
        }
      ]
    }
  }
  ```

---

### 4.2 Get Instant Live Location for All Children (REST Snapshot)
*A high-speed snapshot endpoint designed for the Parent Home Screen to show live statuses of all children's buses in one call.*

- **Method / Endpoint:** `GET /api/v1/parents/user/{userId}/live-location`
- **Headers:** `Authorization: Bearer <YOUR_JWT_TOKEN>`
- **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Parent realtime bus location fetched successfully",
    "data": {
      "parentId": "parent-1111-2222-3333-444455556666",
      "collegeId": "8f3b2a10-4c5d-6e7f-8a9b-0123456789de",
      "buses": [
        {
          "studentId": "student-aaaa-bbbb-cccc-ddddeeeeffff",
          "studentName": "Aarav Prasad",
          "busId": "b51a1111-2222-3333-4444-555566667777",
          "busNumber": "B-12",
          "vehicleNumber": "BA 2 KHA 4567",
          "latitude": 27.676123,
          "longitude": 85.346789,
          "speed": 28.5,
          "heading": 85.2,
          "status": "MOVING",
          "trackingStatus": "LIVE",
          "lastUpdated": 1758302400000
        }
      ]
    }
  }
  ```

---

### 4.3 Get Complete Bus Details & Route Stops (REST)
*Fetches route waypoints, driver info, and emergency contact details for the map screen.*

- **Method / Endpoint:** `GET /api/v1/buses/{busId}`
- **Headers:** `Authorization: Bearer <YOUR_JWT_TOKEN>`
- **Success Response (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Bus fetched successfully",
    "data": {
      "id": "b51a1111-2222-3333-4444-555566667777",
      "busNumber": "B-12",
      "vehicleNumber": "BA 2 KHA 4567",
      "capacity": 35,
      "status": "MOVING",
      "driver": {
        "id": "d10a2b3c-4d5e-6f7a-8b9c-0123456789ab",
        "licenseNumber": "DL-987654321",
        "user": {
          "name": "Ram Bahadur",
          "phoneNumber": "+9779812345678"
        }
      },
      "activeRouteAssignment": {
        "route": {
          "id": "r99a1111-2222-3333-4444-555566667777",
          "name": "Route 4 - City Express",
          "stops": [
            {
              "id": "s1",
              "name": "Koteshwor",
              "latitude": 27.6754,
              "longitude": 85.3456,
              "sequence": 1
            },
            {
              "id": "s2",
              "name": "Baneshwor",
              "latitude": 27.6915,
              "longitude": 85.3342,
              "sequence": 2
            }
          ]
        }
      }
    }
  }
  ```

---

### 4.4 Real-Time WebSocket Subscription (Parent Live Tracking)

#### Step 1: Connect Socket with JWT
```javascript
import { io } from "socket.io-client";

const socket = io("http://<SERVER_HOST>:5000", {
  transports: ["websocket"],
  auth: {
    token: userToken, // JWT token obtained from login
  },
});
```

#### Step 2: Join Bus Tracking Room
When entering the tracking screen, tell the server which bus to listen to:
```javascript
socket.emit("join:bus", { busId: "b51a1111-2222-3333-4444-555566667777" });
```
*(The server immediately replies with the latest known location packet if one is cached in memory).*

#### Step 3: Listen for Real-Time Coordinates (`bus:location`)
```javascript
socket.on("bus:location", (data) => {
  console.log("New Live Location Received:", data);
  // Update map marker position with data.latitude, data.longitude
  // Rotate vehicle marker with data.heading
  // Update speed display with data.speed
});
```

#### Event Payload Schema (`bus:location`):
```json
{
  "busId": "b51a1111-2222-3333-4444-555566667777",
  "collegeId": "8f3b2a10-4c5d-6e7f-8a9b-0123456789de",
  "latitude": 27.676123,
  "longitude": 85.346789,
  "speed": 34.2,
  "heading": 88.0,
  "status": "MOVING",
  "trackingStatus": "LIVE",
  "lastUpdated": 1758302405000
}
```

| Field | Type | Description |
| :--- | :--- | :--- |
| `latitude` | `number` | Exact real-time GPS latitude of the bus. |
| `longitude` | `number` | Exact real-time GPS longitude of the bus. |
| `speed` | `number` | Current speed in km/h. |
| `heading` | `number` | Bearing angle (`0.0` to `360.0`). Rotate map marker accordingly. |
| `status` | `string` | `"MOVING"`, `"IDLE"`, or `"OFFLINE"`. |
| `trackingStatus` | `string` | `"LIVE"` (active within last 30s) or `"OFFLINE"` (> 30s of silence). |
| `lastUpdated` | `number` | Epoch timestamp in milliseconds. |

#### Step 4: Listen for Bus Status Changes (`bus:status`)
```javascript
socket.on("bus:status", (data) => {
  // data: { busId: "uuid", status: "OFFLINE", timestamp: 1758302405000 }
  console.log(`Bus ${data.busId} status changed to ${data.status}`);
});
```

#### Step 5: Leave Bus Room on Screen Exit
When leaving the tracking screen or changing children, unsubscribe from the bus room to preserve device battery and network bandwidth:
```javascript
socket.emit("leave:bus", { busId: "b51a1111-2222-3333-4444-555566667777" });
```

---

## 5. Ready-to-Use Client Code Examples

### 5.1 Flutter (Dart) Example

#### Add Dependencies (`pubspec.yaml`):
```yaml
dependencies:
  http: ^1.2.0
  socket_io_client: ^2.0.3+1
  geolocator: ^11.0.0
```

#### Driver GPS Streaming Service:
```dart
import 'dart:async';
import 'package:geolocator/geolocator.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;

class DriverTrackingService {
  IO.Socket? socket;
  StreamSubscription<Position>? positionStream;

  void startTracking({
    required String serverUrl,
    required String jwtToken,
    required String busId,
  }) {
    socket = IO.io(
      serverUrl,
      IO.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': jwtToken})
          .enableAutoConnect()
          .build(),
    );

    socket?.onConnect((_) => print('Connected to Bus Socket Gateway'));

    // High accuracy device GPS streaming
    const locationSettings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 5, // Stream every 5 meters
    );

    positionStream = Geolocator.getPositionStream(locationSettings: locationSettings)
        .listen((Position position) {
      if (socket != null && socket!.connected) {
        socket!.emit('bus:location_update', {
          'busId': busId,
          'latitude': position.latitude,
          'longitude': position.longitude,
          'speed': (position.speed * 3.6).roundToDouble(), // m/s to km/h
          'heading': position.heading,
          'status': position.speed > 0.5 ? 'MOVING' : 'IDLE',
        });
      }
    });
  }

  void stopTracking(String busId) {
    positionStream?.cancel();
    socket?.emit('bus:location_update', {
      'busId': busId,
      'latitude': 0,
      'longitude': 0,
      'speed': 0,
      'status': 'OFFLINE',
    });
    socket?.disconnect();
  }
}
```

#### Parent Real-time Bus Tracker:
```dart
import 'package:socket_io_client/socket_io_client.dart' as IO;

class ParentTrackingClient {
  IO.Socket? socket;

  void subscribeToBus({
    required String serverUrl,
    required String jwtToken,
    required String busId,
    required Function(Map<String, dynamic>) onLocationReceived,
  }) {
    socket = IO.io(
      serverUrl,
      IO.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': jwtToken})
          .build(),
    );

    socket?.onConnect((_) {
      print('Parent connected. Subscribing to bus $busId');
      socket?.emit('join:bus', {'busId': busId});
    });

    socket?.on('bus:location', (data) {
      if (data is Map<String, dynamic>) {
        onLocationReceived(data);
      }
    });
  }

  void unsubscribe(String busId) {
    socket?.emit('leave:bus', {'busId': busId});
    socket?.disconnect();
  }
}
```

---

### 5.2 React Native (TypeScript) Example

#### Add Dependencies:
```bash
npm install socket.io-client axios react-native-geolocation-service
```

#### Parent Tracking Hook:
```typescript
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export interface BusLocation {
  busId: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  status: 'MOVING' | 'IDLE' | 'OFFLINE';
  trackingStatus: 'LIVE' | 'OFFLINE';
  lastUpdated: number;
}

export function useLiveBus(busId: string, token: string, serverUrl: string) {
  const [location, setLocation] = useState<BusLocation | null>(null);

  useEffect(() => {
    if (!busId || !token) return;

    const socket: Socket = io(serverUrl, {
      transports: ['websocket'],
      auth: { token },
    });

    socket.on('connect', () => {
      socket.emit('join:bus', { busId });
    });

    socket.on('bus:location', (data: BusLocation) => {
      setLocation(data);
    });

    return () => {
      socket.emit('leave:bus', { busId });
      socket.disconnect();
    };
  }, [busId, token, serverUrl]);

  return location;
}
```

---

## 6. Multi-Tenant Security & Error Handling

### 6.1 Strict College Tenant Isolation
The backend strictly enforces college tenant boundaries:
- A Driver can **only** broadcast location for a bus that belongs to their assigned college.
- A Parent can **only** stream location for buses belonging to the college where their child is enrolled.
- Attempting to emit coordinates for or subscribe to a bus outside the authorized college returns:
  ```json
  // Socket.IO event: 'error'
  { "message": "Forbidden: Bus does not belong to your college" }
  ```

### 6.2 Common HTTP Status Codes
| Code | Meaning | Reason |
| :--- | :--- | :--- |
| `200` | **OK** | Operation successful. |
| `400` | **Bad Request** | Invalid inputs, out-of-range coordinates, or duplicate active shift. |
| `401` | **Unauthorized** | Missing or expired JWT token. Refresh session or redirect to Login. |
| `403` | **Forbidden** | Trying to access or track a bus from another college campus. |
| `404` | **Not Found** | Bus, Shift, Driver, or Parent record does not exist. |
| `500` | **Server Error** | Database or unexpected runtime failure. |

---

## 7. Mobile GPS Best Practices Checklist for Developers

1. **Foreground Service (Driver App):**
   - On **Android**, background location updates will be terminated by the OS after a few minutes unless you run a **Foreground Service with a sticky notification** (`FOREGROUND_SERVICE_LOCATION` permission).
   - On **iOS**, enable **Background Modes -> Location updates** in Xcode and request `Always` authorization.
2. **Battery & Data Optimization:**
   - Use a `distanceFilter` of 5–10 meters rather than sending every raw GPS tick.
   - When vehicle speed is `0` for over 15 seconds, reduce ping rate to 5–8 seconds.
3. **Smooth Marker Animation (Parent App):**
   - Do not jump the marker instantaneously on map coordinates. Interpolate between previous `(lat1, lng1)` and new `(lat2, lng2)` over a 1-second duration using linear spherical interpolation (Lerp).
   - Rotate marker icon smoothly using the `heading` property.
4. **Reconnection Handling:**
   - Socket.IO will automatically attempt reconnection. When `reconnect` fires, re-emit `join:bus` to ensure the server registers the client in the room.
