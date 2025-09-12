// script.js

document.addEventListener("DOMContentLoaded", () => {
    const taskManager = new TaskManager();

    // Select form elements
    const taskForm = document.getElementById("taskForm");
    const taskTitle = document.getElementById("taskTitle");
    const taskDescription = document.getElementById("taskDescription");
    const taskPriority = document.getElementById("taskPriority");
    const taskList = document.getElementById("taskList");
    const filterTasks = document.getElementById("filterTasks");
    const sortTasks = document.getElementById("sortTasks");
    const searchTasks = document.getElementById("searchTasks");

    // Function to display tasks based on filters, sorting, and search
    function displayTasks() {
        taskList.innerHTML = "";

        let filteredTasks = taskManager.tasks;

        // Apply filtering
        const filterValue = filterTasks.value;
        if (filterValue !== "all") {
            filteredTasks = taskManager.filterTasks(filterValue);
        }

        // Apply sorting
        const sortValue = sortTasks.value;
        taskManager.sortTasks(sortValue);

        // Apply search
        const searchQuery = searchTasks.value.toLowerCase();
        if (searchQuery) {
            filteredTasks = taskManager.searchTasks(searchQuery);
        }

        filteredTasks.forEach(task => {
            const taskItem = document.createElement("div");
            taskItem.classList.add("task-item");
            if (task.completed) taskItem.classList.add("task-completed");

            taskItem.innerHTML = `
                <div>
                    <strong>${task.title}</strong> - ${task.description}
                    <span>(${task.priority})</span>
                    <br><small>Due Date: ${task.dueDate || "No due date"}</small>
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

    // Handle task submission
    taskForm.addEventListener("submit", (e) => {
        e.preventDefault();
        if (!taskTitle.value.trim()) {
            alert("Task title cannot be empty!");
            return;
        }

        taskManager.addTask(
            taskTitle.value, 
            taskDescription.value, 
            taskPriority.value,
            taskDueDate.value
        );
        taskTitle.value = "";
        taskDescription.value = "";
        taskPriority.value = "low"; 

        displayTasks();
    });

    // Mark task as complete/incomplete
    window.toggleCompletion = (taskId) => {
        taskManager.toggleTaskCompletion(taskId);
        displayTasks();
    };

    // Delete task
    window.deleteTask = (taskId) => {
        taskManager.deleteTask(taskId);
        displayTasks();
    };

    // Apply filters, sorting, and search when user interacts
    filterTasks.addEventListener("change", displayTasks);
    sortTasks.addEventListener("change", displayTasks);
    searchTasks.addEventListener("input", displayTasks);

    // Display tasks when the page loads
    displayTasks();
});
