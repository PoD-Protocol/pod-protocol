// Debug version of terminal to check what's happening
console.log("Terminal script loading...");

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded, checking for terminal elements...");

  const output = document.getElementById("terminal-output");
  const input = document.getElementById("terminal-input");
  const prompt = document.getElementById("terminal-prompt");

  console.log("Output element:", output);
  console.log("Input element:", input);
  console.log("Prompt element:", prompt);

  if (!output) {
    console.error("terminal-output element not found!");
    return;
  }

  if (!input) {
    console.error("terminal-input element not found!");
    return;
  }

  console.log("All terminal elements found, initializing...");

  // Simple test output
  const testLine = document.createElement("div");
  testLine.textContent = '🚀 Terminal is working! Type "help" to see commands.';
  testLine.style.color = "#00ff00";
  output.appendChild(testLine);

  // Add input handler
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      const command = input.value.trim();
      console.log("Command entered:", command);

      // Show command
      const cmdLine = document.createElement("div");
      cmdLine.textContent = `$ ${command}`;
      cmdLine.style.color = "#ffff00";
      output.appendChild(cmdLine);

      // Show response
      const responseLine = document.createElement("div");
      if (command === "help") {
        responseLine.textContent = "Available commands: help, version, test";
      } else if (command === "version") {
        responseLine.textContent = "PoD Protocol CLI v1.4.0";
      } else if (command === "test") {
        responseLine.textContent = "✅ Terminal is working perfectly!";
      } else if (command === "clear") {
        output.innerHTML = "";
        input.value = "";
        return;
      } else {
        responseLine.textContent = `Command not found: ${command}`;
        responseLine.style.color = "#ff0000";
      }

      responseLine.style.color = "#00ff00";
      output.appendChild(responseLine);

      // Clear input and scroll
      input.value = "";
      output.scrollTop = output.scrollHeight;
    }
  });

  console.log("Terminal initialization complete!");
});
