import { splitActivePane } from "../components/panes.js";

class LeaderKey {
  constructor(leaderKey, timeout = 1000) {
    this.leaderKey = leaderKey;
    this.timeout = timeout;
    this.keySequence = [];
    this.timer = null;
    this.bindings = {};
    document.addEventListener("keydown", this.handleKeyDown.bind(this));
  }

  bind(sequence, action) {
    this.bindings[sequence] = action;
  }

  handleKeyDown(event) {
    if (this.timer) clearTimeout(this.timer);

    if (event.ctrlKey && event.key === this.leaderKey) {
      this.keySequence = [this.leaderKey];
    } else if (this.keySequence.length > 0) {
      this.keySequence.push(event.key);
      const command = this.keySequence.slice(1).join("");
      if (this.bindings[command]) {
        this.bindings[command]();
        this.keySequence = [];
      }
    }

    this.timer = setTimeout(() => (this.keySequence = []), this.timeout);
  }
}

export function initializeLeaderKey() {
  const leaderKey = new LeaderKey("p");
  leaderKey.bind("-", () => splitActivePane("horizontal"));
  leaderKey.bind("|", () => splitActivePane("vertical"));
}
