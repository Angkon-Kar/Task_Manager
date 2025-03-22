// script.js

// Ensure this runs after the page loads
document.addEventListener("DOMContentLoaded", () => {
    const taskManager = new TaskManager(); // Create instance of TaskManager

    // Select form elements
    const taskForm = document.getElementById("taskForm");
    const taskTitle = document.getElementById("taskTitle");
    const taskDescription = document.getElementById("taskDescription");
    const taskPriority = document.querySelector("select"); // Select priority dropdown
    const taskList = document.getElementById("taskList");

    // Function to display tasks in the UI
    function displayTasks() {
        taskList.innerHTML = ""; // Clear existing tasks

        const tasks = taskManager.tasks; // Get tasks from local storage
        tasks.forEach(task => {
            const taskItem = document.createElement("div");
            taskItem.classList.add("task-item");
            if (task.completed) taskItem.classList.add("task-completed");

            taskItem.innerHTML = `
                <div>
                    <h3>${task.title}</h3>
                    <p>${task.description}</p>
                    <span>Priority: ${task.priority}</span>
                </div>
                <div class="task-actions">
                    <button class="complete-btn" onclick="toggleCompletion(${task.id})">
                        ${task.completed ? "Undo" : "Complete"}
                    </button>
                    <button class="delete-btn" onclick="deleteTask(${task.id})">Delete</button>
                </div>
            `;

            taskList.appendChild(taskItem);
        });
    }

    // Handle form submission (Add Task)
    taskForm.addEventListener("submit", (e) => {
        e.preventDefault();

        if (!taskTitle.value.trim()) {
            alert("Task title cannot be empty!");
            return;
        }

        taskManager.addTask(taskTitle.value, taskDescription.value, taskPriority.value);
        taskTitle.value = "";
        taskDescription.value = "";
        taskPriority.value = "low"; // Reset form

        displayTasks(); // Refresh task list
    });

    // Mark task as completed/incomplete
    window.toggleCompletion = (taskId) => {
        taskManager.toggleTaskCompletion(taskId);
        displayTasks();
    };

    // Delete a task
    window.deleteTask = (taskId) => {
        taskManager.deleteTask(taskId);
        displayTasks();
    };

    // Display tasks when the page loads
    displayTasks();
});
