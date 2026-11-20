# Offline Mesh Network (Hive Mind) Tic Tac Toe

This plan addresses the goal of learning to build a true offline mesh network where devices act as transmitters, receivers, and **relays**.

Since web technologies (React/Capacitor) cannot access the low-level Bluetooth/Wi-Fi Direct hardware needed for true offline mesh networks, this plan pivots to **React Native** (a framework for building native mobile apps using JavaScript/React).

## Tech Stack Shift
To build an offline mesh network, we must use native Android APIs. We will use **React Native** along with the **Google Nearby Connections API** (`react-native-google-nearby-connection`). This API uses Bluetooth, BLE, and Wi-Fi Direct seamlessly to connect devices without any internet.

## Building the "Hive Mind" (Relay Logic)
Out of the box, Nearby Connections connects devices directly. To achieve a "Hive Mind" where devices relay information to out-of-range devices, we will build a **Custom Application-Layer Mesh**. 
- Device A connects to Device B.
- Device C (out of range of A) connects to Device B.
- When C makes a move in Tic Tac Toe, it sends the data to B. B recognizes the data is for A, and **relays** the message to A.

## Proposed Changes

### 1. React Native Initialization
- Initialize a bare React Native project (this allows us to link native Android libraries for Bluetooth/Wi-Fi Direct).
- Set up the UI for the Tic Tac Toe board and a "Network Topology" view to visualize connected devices in the mesh.
- **Files:** `App.tsx`, `src/components/Board.tsx`, `src/components/MeshVisualizer.tsx`

### 2. Google Nearby Connections Integration
- Install and configure `react-native-google-nearby-connection`.
- Request necessary Android permissions (`BLUETOOTH`, `BLUETOOTH_ADMIN`, `ACCESS_FINE_LOCATION`, `ACCESS_WIFI_STATE`, `NEARBY_WIFI_DEVICES`).
- Implement the discovery and advertising logic using the `P2P_CLUSTER` strategy (allows a device to accept incoming connections while also connecting to others).

### 3. Custom Mesh Routing Protocol (The Relay)
- Create a routing table in the app state.
- Each device generates a unique ID (Node ID).
- When a device connects, they exchange their known routing tables.
- **Message Structure:** `{ source: "Node_C", destination: "Node_A", data: { move: X, position: 4 } }`.
- **Relay Logic:** If Node B receives a message where `destination != Node_B`, it looks up `Node_A` in its routing table and forwards (relays) the message.
- **Files:** `src/mesh/MeshManager.ts`, `src/mesh/RoutingTable.ts`

### 4. Tic Tac Toe Game Logic over Mesh
- Implement the game state machine.
- Ensure that moves are broadcasted or routed specifically to the opponent's node ID.
- Handle edge cases (e.g., what happens if the relay node disconnects mid-game).

### 5. Automated APK Publishing (GitHub Actions)
- We will still use GitHub Actions to automate the APK generation.
- The workflow will run standard Android build commands (`./gradlew assembleDebug`) and publish to GitHub Releases.

## Verification Plan
- **Test 1:** Connect A to B, and B to C. (A and C are far apart). 
- **Test 2:** Send a chat message or Tic Tac Toe move from C to A. Verify that B receives it and forwards it successfully to A.
