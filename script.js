document.addEventListener("DOMContentLoaded", () => {
    const taskManager = new TaskManager();

    const taskForm = document.getElementById("taskForm");
    const taskTitle = document.getElementById("taskTitle");
    const taskDescription = document.getElementById("taskDescription");
    const taskPriority = document.getElementById("taskPriority");
    const taskDueDate = document.getElementById("taskDueDate");
    const taskList = document.getElementById("taskList");
    const filterTasks = document.getElementById("filterTasks");
    const sortTasks = document.getElementById("sortTasks");
    const searchTasks = document.getElementById("searchTasks");

    <span class="priority-badge priority-${task.priority}">${task.priority}</span>

    // Default form submit handler
    const defaultSubmitHandler = (e) => {
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

        taskForm.reset();
        displayTasks();
    };
    taskForm.onsubmit = defaultSubmitHandler;

    function displayTasks() {
        taskList.innerHTML = "";

        let filteredTasks = taskManager.tasks;

        const filterValue = filterTasks.value;
        if (filterValue !== "all") {
            filteredTasks = taskManager.filterTasks(filterValue);
        }

        const sortValue = sortTasks.value;
        taskManager.sortTasks(sortValue);

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
                    <button class="edit-btn" onclick="editTask(${task.id})">Edit</button>
                    <button class="delete-btn" onclick="deleteTask(${task.id})">Delete</button>
                </div>
            `;

            taskList.appendChild(taskItem);
        });
    }

    window.toggleCompletion = (taskId) => {
        taskManager.toggleTaskCompletion(taskId);
        displayTasks();
    };

    window.deleteTask = (taskId) => {
        if (confirm("Are you sure you want to delete this task?")) {
            taskManager.deleteTask(taskId);
            displayTasks();
        }
    };

    window.editTask = (taskId) => {
        const task = taskManager.tasks.find(t => t.id === taskId);
        if (!task) return;

        // Pre-fill form
        taskTitle.value = task.title;
        taskDescription.value = task.description;
        taskPriority.value = task.priority;
        taskDueDate.value = task.dueDate !== "No due date" ? task.dueDate : "";

        // Change button label
        const submitBtn = taskForm.querySelector("button[type='submit']");
        submitBtn.textContent = "Update Task";

        // Override form submit
        taskForm.onsubmit = (e) => {
            e.preventDefault();

            taskManager.updateTask(taskId, {
                title: taskTitle.value,
                description: taskDescription.value,
                priority: taskPriority.value,
                dueDate: taskDueDate.value || "No due date"
            });

            taskForm.reset();
            submitBtn.textContent = "Add Task";
            taskForm.onsubmit = defaultSubmitHandler;

            displayTasks();
        };
    };

    filterTasks.addEventListener("change", displayTasks);
    sortTasks.addEventListener("change", displayTasks);
    searchTasks.addEventListener("input", displayTasks);

    displayTasks();
});
