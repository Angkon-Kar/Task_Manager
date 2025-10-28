document.addEventListener("DOMContentLoaded", () => {
    const taskManager = new TaskManager();

    // Form elements
    const taskForm = document.getElementById("taskForm");
    const taskTitle = document.getElementById("taskTitle");
    const taskDescription = document.getElementById("taskDescription");
    const taskPriority = document.getElementById("taskPriority");
    const taskDueDate = document.getElementById("taskDueDate");
    const taskRecurrence = document.getElementById("taskRecurrence");
    const taskCategory = document.getElementById("taskCategory");
    const submitBtn = document.getElementById("submitBtn");
    const cancelEditBtn = document.getElementById("cancelEditBtn");

    // Controls
    const taskList = document.getElementById("taskList");
    const filterTasks = document.getElementById("filterTasks");
    const filterCategory = document.getElementById("filterCategory");
    const sortTasks = document.getElementById("sortTasks");
    const searchTasks = document.getElementById("searchTasks");

    // Bulk controls
    const selectAllBtn = document.getElementById("selectAllBtn");
    const clearSelectionBtn = document.getElementById("clearSelectionBtn");
    const bulkCompleteBtn = document.getElementById("bulkCompleteBtn");
    const bulkDeleteBtn = document.getElementById("bulkDeleteBtn");

    // export/import
    const exportBtn = document.getElementById("exportBtn");
    const importBtn = document.getElementById("importBtn");
    const importFile = document.getElementById("importFile");

    // progress
    const progressPercent = document.getElementById("progressPercent");
    const progressFill = document.getElementById("progressFill");

    // state
    let editingTaskId = null;
    let selectedIds = new Set();

    // default submit handler (Add)
    function defaultSubmit(e) {
        e.preventDefault();
        const title = taskTitle.value.trim();
        if (!title) return alert("Task title cannot be empty!");

        try {
            taskManager.addTask({
                title,
                description: taskDescription.value,
                priority: taskPriority.value,
                dueDate: taskDueDate.value || "",
                category: taskCategory.value || "",
                recurrence: taskRecurrence.value || "none"
            });
        } catch (err) {
            return alert(err.message || "Failed to add");
        }

        taskForm.reset();
        taskPriority.value = "low";
        taskRecurrence.value = "none";
        taskCategory.value = "";
        render();
    }
    taskForm.addEventListener("submit", defaultSubmit);

    // cancel edit
    cancelEditBtn.addEventListener("click", () => {
        exitEditMode();
    });

    // helpers
    function enterEditMode(task) {
        editingTaskId = task.id;
        taskTitle.value = task.title;
        taskDescription.value = task.description;
        taskPriority.value = task.priority;
        taskDueDate.value = task.dueDate || "";
        taskRecurrence.value = task.recurrence || "none";
        taskCategory.value = task.category || "";
        submitBtn.textContent = "Update Task";
        cancelEditBtn.classList.remove("hidden");
        // swap submit handler
        taskForm.removeEventListener("submit", defaultSubmit);
        taskForm.addEventListener("submit", submitUpdate);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function submitUpdate(e) {
        e.preventDefault();
        const updates = {
            title: taskTitle.value.trim(),
            description: taskDescription.value,
            priority: taskPriority.value,
            dueDate: taskDueDate.value || "",
            recurrence: taskRecurrence.value || "none",
            category: taskCategory.value || ""
        };
        taskManager.updateTask(editingTaskId, updates);
        exitEditMode();
        render();
    }

    function exitEditMode() {
        editingTaskId = null;
        taskForm.reset();
        submitBtn.textContent = "Add Task";
        cancelEditBtn.classList.add("hidden");
        taskForm.removeEventListener("submit", submitUpdate);
        taskForm.addEventListener("submit", defaultSubmit);
        selectedIds.clear();
        updateBulkButtons();
    }

    function isOverdue(task) {
        if (!task.dueDate) return false;
        const due = new Date(task.dueDate + "T23:59:59");
        const now = new Date();
        return !task.completed && due < now;
    }
    function isDueToday(task) {
        if (!task.dueDate) return false;
        const due = task.dueDate;
        const today = new Date().toISOString().slice(0, 10);
        return due === today;
    }

    // toggle completion - takes into account recurrence creation
    window.toggleCompletion = (taskId) => {
        taskManager.toggleTaskCompletion(taskId);
        render();
    };

    window.deleteTask = (taskId) => {
        if (!confirm("Delete this task?")) return;
        taskManager.deleteTask(taskId);
        selectedIds.delete(taskId);
        render();
    };

    window.editTask = (taskId) => {
        const task = taskManager.tasks.find(t => t.id === taskId);
        if (!task) return;
        enterEditMode(task);
    };

    // selection handling
    function toggleSelect(taskId, checked) {
        if (checked) selectedIds.add(taskId);
        else selectedIds.delete(taskId);
        updateBulkButtons();
    }

    function updateBulkButtons() {
        const any = selectedIds.size > 0;
        bulkCompleteBtn.disabled = !any;
        bulkDeleteBtn.disabled = !any;
    }

    selectAllBtn.addEventListener("click", () => {
        taskManager.tasks.forEach(t => selectedIds.add(t.id));
        render(); // re-render to check boxes
    });
    clearSelectionBtn.addEventListener("click", () => {
        selectedIds.clear();
        render();
    });

    bulkCompleteBtn.addEventListener("click", () => {
        if (!selectedIds.size) return;
        const ids = Array.from(selectedIds);
        taskManager.bulkUpdate(ids, { completed: true });
        // handle recurrence: for each completed with recurrence, the toggle logic in TaskManager won't run so we emulate next recurrence
        ids.forEach(id => {
            const t = taskManager.tasks.find(tt => tt.id === id);
            if (t && t.recurrence && t.recurrence !== "none") {
                const next = TaskManager._getNextDueDate(t.dueDate, t.recurrence);
                if (next) {
                    taskManager.addTask({
                        title: t.title,
                        description: t.description,
                        priority: t.priority,
                        dueDate: next,
                        category: t.category,
                        recurrence: t.recurrence
                    });
                }
            }
        });
        selectedIds.clear();
        render();
    });

    bulkDeleteBtn.addEventListener("click", () => {
        if (!selectedIds.size) return;
        if (!confirm(`Delete ${selectedIds.size} selected task(s)?`)) return;
        taskManager.bulkDelete(Array.from(selectedIds));
        selectedIds.clear();
        render();
    });

    // export/import
    exportBtn.addEventListener("click", () => {
        const data = taskManager.exportTasks();
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `tasks_export_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });

    importBtn.addEventListener("click", () => importFile.click());
    importFile.addEventListener("change", (ev) => {
        const file = ev.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const ok = taskManager.importTasks(reader.result);
            if (ok) {
                alert("Import successful");
                render();
            } else {
                alert("Import failed - invalid file");
            }
        };
        reader.readAsText(file);
        importFile.value = "";
    });

    // search/filter/sort listeners
    filterTasks.addEventListener("change", render);
    filterCategory.addEventListener("change", render);
    sortTasks.addEventListener("change", render);
    searchTasks.addEventListener("input", render);

    // main render
    function render() {
        // apply filters
        let tasks = taskManager.filterTasks(filterTasks.value);
        if (filterCategory.value && filterCategory.value !== "all") {
            tasks = tasks.filter(t => (t.category || "") === filterCategory.value);
        }

        // apply search
        const q = searchTasks.value.trim();
        if (q) tasks = tasks.filter(t => (t.title + " " + t.description).toLowerCase().includes(q.toLowerCase()));

        // apply sorting (also persists order in taskManager)
        taskManager.sortTasks(sortTasks.value);
        // reflect sorted order but only keep the filtered subset
        const sortedAll = taskManager.tasks;
        // maintain the order of sortedAll
        tasks = sortedAll.filter(t => tasks.some(s => s.id === t.id));

        // render list
        taskList.innerHTML = "";
        if (!tasks.length) {
            taskList.innerHTML = `<div class="small-muted">No tasks found.</div>`;
            updateProgress();
            return;
        }

        tasks.forEach(task => {
            const item = document.createElement("div");
            item.className = "task-item enter";
            if (task.completed) item.classList.add("task-completed");
            if (isOverdue(task)) item.classList.add("task-overdue");

            // left column
            const left = document.createElement("div");
            left.className = "task-left";

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.checked = selectedIds.has(task.id);
            checkbox.addEventListener("change", (e) => toggleSelect(task.id, e.target.checked));
            left.appendChild(checkbox);

            const info = document.createElement("div");
            info.className = "task-info";

            const titleRow = document.createElement("div");
            titleRow.className = "task-title";

            const titleText = document.createElement("span");
            titleText.textContent = task.title;
            titleText.style.minWidth = 0;
            titleRow.appendChild(titleText);

            // priority badge
            const pr = document.createElement("span");
            pr.className = `badge priority-${task.priority}`;
            pr.textContent = task.priority.toUpperCase();
            titleRow.appendChild(pr);

            // category
            if (task.category) {
                const cat = document.createElement("span");
                cat.className = "category-badge";
                cat.textContent = task.category;
                titleRow.appendChild(cat);
            }

            info.appendChild(titleRow);

            // description
            if (task.description) {
                const desc = document.createElement("div");
                desc.className = "task-desc";
                desc.textContent = task.description;
                // Add style to allow wrapping, overriding the nowrap from CSS on mobile
                if (window.innerWidth < 600) {
                    desc.style.whiteSpace = "normal";
                }
                info.appendChild(desc);
            }

            // meta row
            const meta = document.createElement("div");
            meta.className = "task-meta";
            if (task.dueDate) {
                const due = document.createElement("span");
                due.className = "small-muted";
                due.innerHTML = `<strong>Due:</strong> ${task.dueDate}`;
                meta.appendChild(due);
            } else {
                const noDue = document.createElement("span");
                noDue.className = "small-muted";
                noDue.textContent = "No due date";
                meta.appendChild(noDue);
            }

            if (isDueToday(task)) {
                const todayTag = document.createElement("span");
                todayTag.className = "badge badge-today";
                todayTag.textContent = "Today";
                meta.appendChild(todayTag);
            }

            if (task.recurrence && task.recurrence !== "none") {
                const rec = document.createElement("span");
                rec.className = "small-muted";
                rec.textContent = `Repeats: ${task.recurrence}`;
                meta.appendChild(rec);
            }

            info.appendChild(meta);
            left.appendChild(info);

            // actions right
            const actions = document.createElement("div");
            actions.className = "task-actions";

            const completeBtn = document.createElement("button");
            completeBtn.className = "secondary";
            completeBtn.textContent = task.completed ? "Undo" : "Complete";
            completeBtn.addEventListener("click", () => {
                taskManager.toggleTaskCompletion(task.id);
                render();
            });
            actions.appendChild(completeBtn);

            const editBtn = document.createElement("button");
            editBtn.textContent = "Edit";
            editBtn.addEventListener("click", () => {
                enterEditMode(task);
            });
            actions.appendChild(editBtn);

            const delBtn = document.createElement("button");
            delBtn.className = "danger";
            delBtn.textContent = "Delete";
            delBtn.addEventListener("click", () => {
                if (!confirm("Delete this task?")) return;
                taskManager.deleteTask(task.id);
                selectedIds.delete(task.id);
                render();
            });
            actions.appendChild(delBtn);

            item.appendChild(left);
            item.appendChild(actions);

            taskList.appendChild(item);
        });

        updateProgress();
        updateBulkButtons();
    }

    function updateProgress() {
        const all = taskManager.tasks.length;
        if (!all) {
            progressPercent.textContent = "0%";
            progressFill.style.width = "0%";
            return;
        }
        const done = taskManager.tasks.filter(t => t.completed).length;
        const pct = Math.round((done / all) * 100);
        progressPercent.textContent = `${pct}%`;
        progressFill.style.width = `${pct}%`;
    }

    // initial render
    render();
});
