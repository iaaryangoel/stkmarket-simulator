-------------------------------------
📈 Stock Market Simulation Platform
-------------------------------------
A **real-time Stock Market Simulator**.
This platform allows **Admins**, **Employees**, and **Participants** to interact with a simulated stock market featuring **live price updates**, **market news impact**, **trading**, and **leaderboards**.

---------------
🛠️ Tech Stack
---------------
Frontend:
* **React + TypeScript**
  → Used to build all dashboards (Admin, Employee, Participant) with type safety.
* **Vite**
  → Fast development server and optimized production build.
* **Tailwind CSS**
  → Styling, layout, responsive design, animations.
* **shadcn/ui**
  → Reusable UI components (Cards, Buttons, Tabs, Inputs).
* **Socket.IO Client**
  → Receives real-time updates for shares, news, and leaderboard.
* **Axios**
  → API communication with backend.

Backend:
* **Node.js + Express.js**
  → REST API server handling users, shares, news, and trades.
* **MongoDB + Mongoose**
  → Stores users, shares, trades, and news data.
* **Socket.IO**
  → Pushes live updates to all connected clients.
* **dotenv**
  → Environment variable management.

---------------
👥 User Roles
---------------
👑 Admin
* Add / Delete shares
* Hault / Resume market fluctuations button
* Post market news
* Control price movement
* View live leaderboard

🧑‍💼 Employee
* Perform trading for the participants
* View live share prices
* View live market news
* View live leaderboard

🧑‍🎓 Participant
* Trade shares through employee (Buy / Sell)
* View live share prices
* View live market news
* View recent trades
* Compete on leaderboard

-------------
✨ Features
-------------
🔐 Authentication & Roles
* Login / Signup system
* Secret keys for Admin & Employee
* Role-based dashboard access

📊 Share Management
* Admin can add new shares with their initial price
* Manual price change buttons for admin
* Shares can be locked during news impact to prevent price overlaps

📰 Market News System
* Admin posts news with:
  * Sentiment (Positive / Negative)
  * Impact level (1–5)
  * Affected shares
* News causes **gradual price change** over time
* Latest news appears as:
  * **Breaking News** (blinking & highlighted)
  * Older news shifts below automatically
* All users see news in real-time

📉 Automatic Market Fluctuation
* Share prices fluctuate randomly over time
* Replicates real market volatility
* Small up/down movements even without news

💹 Trading System
* Buy shares from the market
* Sell shares to the market
* Peer to Peer trading
* Complete tracked trade history

🏆 Live Leaderboard
* Ranks participants by **Total Net Worth**
* Net Worth = Cash + Value of holdings
* Updates in real-time after:
  * Trades
  * News impact
  * Price fluctuations

📺 Public Market View (Without Login)
* **Market News View**
* **Live Leaderboard View**
* **Share Market View**

------------
👨‍💻 Author
------------
**Aaryan Goel**
B.Tech CSE | Full-Stack Developer

-----------------------------------------------------------------------------------------------------
IMP : **This Project was delivered to an actual client and was made client requirement specific.**
-----------------------------------------------------------------------------------------------------

