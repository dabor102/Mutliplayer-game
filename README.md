# Alien Battleships 🚀

A real-time multiplayer browser game that challenges pairs of players to work together as Shooter and Spotter to locate and destroy hidden objects in space. Built with Flask, Socket.IO, and modern web technologies.

## 🎮 Game Overview

Alien Battleships is a cooperative multiplayer game where two players team up to complete increasingly challenging levels. Each player takes turns in different roles:

- **Shooter**: Clicks grid cells to attempt hits on hidden objects
- **Spotter**: Sees the results of each shot and guides the Shooter

- The catch is that the have to communicate efficiently to beat the time.

### Key Features

- **Real-time Multiplayer**: Seamless player pairing and role-switching
- **Progressive Difficulty**: 5 challenging levels with different object patterns
- **Dynamic Rewards**: Bonus time and clicks for destroying objects
- **Interactive UI**: Particle effects, space-themed animations, and role-specific visual feedback
- **Adaptive Scoring**: Track hits, misses, and performance across multiple rounds

## 🛠️ Technical Stack

- **Backend**: Flask + Socket.IO
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Communication**: WebSocket for real-time updates
- **Deployment**: Ready for Render deployment

## 🎯 Gameplay Mechanics

### Objectives
- Find and destroy all hidden objects within the time and click limits
- Coordinate effectively with your teammate
- Progress through all levels with increasing complexity

### Special Features
- Role-specific grid views
- Visual feedback for hits and misses
- Particle effects for destroyed objects
- Bonus rewards system:
  - +5 seconds for destroying an object
  - Extra clicks based on object size
  - +1 second for two consecutive hits

## 🏗️ Installation

1. Clone the repository:
```bash
git clone [your-repository-url]
cd space-grids-tournament
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the game:
```bash
python app.py
```

4. Open `http://localhost:5001` in your browser

## 🎨 Game Objects

The game features various object shapes:
- Single cell
- T-shape
- 3x3 square
- X-shape

Each shape presents unique challenges and requires different strategies to locate and destroy.

## 🔄 Level Progression

Levels will be added continously

| Level | Grid Size | Objects | Time Limit | Click Limit | Available Shapes |
|-------|-----------|----------|------------|-------------|------------------|
| 1 | 10x10 | 1 | 20s | 20 | Square 3x3 |
| 2 | 10x10 | 2 | 20s | 30 | Square 3x3 |
| 3 | 10x10 | 2 | 25s | 30 | Square 3x3, X-shape |
| 4 | 10x10 | 3 | 25s | 30 | Square 3x3, X-shape, T-shape |
| 5 | 10x10 | 3 | 25s | 30 | T-shape |

## 🌟 Success Strategy

1. **Communication is Key**: Players must coordinate effectively
2. **Time Management**: Use bonus time rewards strategically
3. **Pattern Recognition**: Learn common object placements
4. **Role Mastery**: Understand both Shooter and Spotter perspectives

## 🚀 Deployment

The game includes a `render.yaml` configuration file for easy deployment to Render:

```yaml
services:
  - type: web
    name: shooter-spotter-game
    env: python
    plan: free
    buildCommand: "pip install -r requirements.txt"
    startCommand: "python app.py"
```

## 🛡️ Dependencies

Key dependencies include:
- Flask 2.2.5
- Flask-SocketIO 5.3.4
- Python-SocketIO 5.8.0
- Gevent 22.10.2
- Gunicorn 20.1.0

## 🤝 Contributing

Contributions are welcome! Feel free to:
1. Fork the repository
2. Create a feature branch
3. Submit a Pull Request

## 📜 License

tbd

## 🙋‍♂️ Support

For issues, questions, or contributions, please open an issue in the GitHub repository.
