document.addEventListener("DOMContentLoaded", () => {
    const taskManager = new TaskManager();

    // Select form elements
    const taskForm = document.getElementById("taskForm");
    const taskTitle = document.getElementById("taskTitle");
    const taskDescription = document.getElementById("taskDescription");
    const taskPriority = document.getElementById("taskPriority");
    const taskDueDate = document.getElementById("taskDueDate");
    const taskCategory = document.getElementById("taskCategory");
    const recurring = document.getElementById("recurring");
    const taskList = document.getElementById("taskList");

    // Controls
    const filterTasks = document.getElementById("filterTasks");
    const sortTasks = document.getElementById("sortTasks");
    const searchTasks = document.getElementById("searchTasks");
    const filterCategory = document.getElementById("filterCategory");

    // Bulk action controls
    const bulkComplete = document.getElementById("bulkComplete");
    const bulkDelete = document.getElementById("bulkDelete");

    // Progress tracker
    const progressBar = document.getElementById("progressBar");

    let editMode = false;
    let editTaskId = null;

    // Function to render tasks
    function render() {
        taskList.innerHTML = "";

        let tasksToRender = [...taskManager.tasks];

        // Filtering
        const filterValue = filterTasks.value;
        if (filterValue !== "all") {
            tasksToRender = taskManager.filterTasks(filterValue);
        }

        // Category filtering
        const catFilter = filterCategory.value;
        if (catFilter !== "all") {
            tasksToRender = tasksToRender.filter(t => t.category === catFilter);
        }

        // Sorting
        const sortValue = sortTasks.value;
        taskManager.sortTasks(sortValue);

        // Search
        const searchQuery = searchTasks.value.toLowerCase();
        if (searchQuery) {
            tasksToRender = taskManager.searchTasks(searchQuery);
        }

        // Render each task
        tasksToRender.forEach(task => {
            const taskItem = document.createElement("div");
            taskItem.classList.add("task-item");

            if (task.completed) taskItem.classList.add("task-completed");

            // Check overdue
            const today = new Date().toISOString().split("T")[0];
            if (!task.completed && task.dueDate && task.dueDate < today) {
                taskItem.classList.add("overdue");
            }

            // Checkbox for bulk selection
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.className = "task-select";
            checkbox.dataset.id = task.id;
            taskItem.appendChild(checkbox);

            // Content wrapper
            const content = document.createElement("div");
            content.className = "task-content";

            // Title row with badges
            const titleRow = document.createElement("div");
            titleRow.innerHTML = `<strong>${task.title}</strong>`;

            // Priority badge
            const priority = document.createElement("span");
            priority.className = `priority-badge ${task.priority}`;
            priority.textContent = task.priority.toUpperCase();
            titleRow.appendChild(priority);

            // Category badge
            if (task.category && task.category !== "none") {
                const cat = document.createElement("span");
                cat.className = `category-badge ${task.category}`;
                cat.textContent = task.category;
                titleRow.appendChild(cat);
            }

            content.appendChild(titleRow);

            // Description
            if (task.description) {
                const desc = document.createElement("p");
                desc.textContent = task.description;
                content.appendChild(desc);
            }

            // Due date
            const due = document.createElement("small");
            due.innerHTML = `<strong>Due:</strong> ${task.dueDate || "No due date"}`;
            content.appendChild(due);

            taskItem.appendChild(content);

            // Task actions
            const actions = document.createElement("div");
            actions.className = "task-actions";

            // Complete button
            const completeBtn = document.createElement("button");
            completeBtn.className = "complete-btn";
            completeBtn.textContent = task.completed ? "Undo" : "Complete";
            completeBtn.onclick = () => {
                taskManager.toggleTaskCompletion(task.id);
                render();
            };
            actions.appendChild(completeBtn);

            // Edit button
            const editBtn = document.createElement("button");
            editBtn.className = "edit-btn";
            editBtn.textContent = "Edit";
            editBtn.onclick = () => {
                enterEditMode(task);
            };
            actions.appendChild(editBtn);

            // Delete button
            const deleteBtn = document.createElement("button");
            deleteBtn.className = "delete-btn";
            deleteBtn.textContent = "Delete";
            deleteBtn.onclick = () => {
                taskManager.deleteTask(task.id);
                render();
            };
            actions.appendChild(deleteBtn);

            taskItem.appendChild(actions);

            taskList.appendChild(taskItem);
        });

        updateProgress();
    }

    // Enter edit mode
    function enterEditMode(task) {
        editMode = true;
        editTaskId = task.id;
        taskTitle.value = task.title;
        taskDescription.value = task.description;
        taskPriority.value = task.priority;
        taskDueDate.value = task.dueDate && task.dueDate !== "No due date" ? task.dueDate : "";
        taskCategory.value = task.category || "none";
        recurring.checked = task.recurring || false;

        const cancelBtn = document.createElement("button");
        cancelBtn.type = "button";
        cancelBtn.id = "cancelEdit";
        cancelBtn.textContent = "Cancel Edit";
        cancelBtn.onclick = exitEditMode;
        taskForm.appendChild(cancelBtn);
    }

    // Exit edit mode
    function exitEditMode() {
        editMode = false;
        editTaskId = null;
        taskForm.reset();
        const cancelBtn = document.getElementById("cancelEdit");
        if (cancelBtn) cancelBtn.remove();
    }

    // Update progress bar
    function updateProgress() {
        const total = taskManager.tasks.length;
        const completed = taskManager.tasks.filter(t => t.completed).length;
        const percentage = total > 0 ? (completed / total) * 100 : 0;
        progressBar.style.width = percentage + "%";
        progressBar.textContent = `${Math.round(percentage)}%`;
    }

    // Handle form submit
    taskForm.addEventListener("submit", (e) => {
        e.preventDefault();
        if (!taskTitle.value.trim()) {
            alert("Task title cannot be empty!");
            return;
        }

        if (editMode) {
            taskManager.updateTask(editTaskId, {
                title: taskTitle.value,
                description: taskDescription.value,
                priority: taskPriority.value,
                dueDate: taskDueDate.value,
                category: taskCategory.value,
                recurring: recurring.checked
            });
            exitEditMode();
        } else {
            taskManager.addTask(
                taskTitle.value,
                taskDescription.value,
                taskPriority.value,
                taskDueDate.value,
                taskCategory.value,
                recurring.checked
            );
        }

        taskForm.reset();
        render();
    });

    // Bulk complete
    bulkComplete.addEventListener("click", () => {
        document.querySelectorAll(".task-select:checked").forEach(cb => {
            taskManager.toggleTaskCompletion(parseInt(cb.dataset.id));
        });
        render();
    });

    // Bulk delete
    bulkDelete.addEventListener("click", () => {
        document.querySelectorAll(".task-select:checked").forEach(cb => {
            taskManager.deleteTask(parseInt(cb.dataset.id));
        });
        render();
    });

    // Controls
    filterTasks.addEventListener("change", render);
    sortTasks.addEventListener("change", render);
    searchTasks.addEventListener("input", render);
    filterCategory.addEventListener("change", render);

    // Initial render
    render();
});
