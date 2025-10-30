document.addEventListener("DOMContentLoaded", () => {
    // Make sure taskManager.js is loaded before this script
    if (typeof TaskManager === 'undefined') {
        console.error("TaskManager class not found. Ensure taskManager.js is loaded first.");
        return;
    }
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
    
    // ⭐ Category Management Elements
    const manageCategoryBtn = document.getElementById("manageCategoryBtn");
    const categoryModal = document.getElementById("categoryModal");
    const closeModalBtn = document.getElementById("closeModalBtn");
    const newCategoryInput = document.getElementById("newCategoryInput");
    const addCategoryBtn = document.getElementById("addCategoryBtn");
    const dynamicCategoryList = document.getElementById("dynamicCategoryList");

    // state
    let editingTaskId = null;
    let selectedIds = new Set();
    let draggedItem = null; // Drag and Drop State

    // ⭐ Category Logic
    const STATIC_CATEGORIES = ["", "Work", "Personal", "Study"]; // "" = General
    let customCategories = JSON.parse(localStorage.getItem("customCategories")) || [];

    function renderCategoryOptions() {
        const allCategories = [...STATIC_CATEGORIES, ...customCategories];
        const uniqueCategories = [...new Set(allCategories.filter(c => c !== ""))];

        // 1. Task Form Options
        const currentTaskCategory = taskCategory.value;
        taskCategory.innerHTML = STATIC_CATEGORIES.map(c => 
            `<option value="${c}" ${c === currentTaskCategory ? 'selected' : ''}>${c || 'General'}</option>`
        ).join('');
        taskCategory.innerHTML += uniqueCategories.filter(c => !STATIC_CATEGORIES.includes(c)).map(c => 
            `<option value="${c}" ${c === currentTaskCategory ? 'selected' : ''}>${c}</option>`
        ).join('');
        
        // 2. Filter Form Options
        const currentFilterCategory = filterCategory.value;
        filterCategory.innerHTML = `<option value="all">All</option>`;
        filterCategory.innerHTML += uniqueCategories.map(c => 
            `<option value="${c}" ${c === currentFilterCategory ? 'selected' : ''}>${c}</option>`
        ).join('');
        filterCategory.value = currentFilterCategory; 
        
        // 3. Manage Category List (Modal)
        dynamicCategoryList.innerHTML = uniqueCategories.map(c => `
            <div class="category-item">
                <span>${c}</span>
                <button class="danger" onclick="deleteCategory('${c}')" ${STATIC_CATEGORIES.includes(c) ? 'disabled' : ''}>Delete</button>
            </div>
        `).join('');
    }

    // Global deleteCategory function (called from modal button)
    window.deleteCategory = (category) => {
        if (STATIC_CATEGORIES.includes(category)) {
            return alert("You cannot delete a default category.");
        }
        customCategories = customCategories.filter(c => c !== category);
        localStorage.setItem("customCategories", JSON.stringify(customCategories));
        renderCategoryOptions();
        render(); 
    };

    // Category Modal Controls
    manageCategoryBtn.addEventListener("click", () => {
        categoryModal.classList.remove("hidden");
        renderCategoryOptions();
    });

    closeModalBtn.addEventListener("click", () => {
        categoryModal.classList.add("hidden");
    });

    addCategoryBtn.addEventListener("click", () => {
        const newCat = newCategoryInput.value.trim();
        if (!newCat) return;

        const all = [...STATIC_CATEGORIES, ...customCategories];
        if (all.map(c => c.toLowerCase()).includes(newCat.toLowerCase())) {
            return alert("Category already exists.");
        }

        customCategories.push(newCat);
        localStorage.setItem("customCategories", JSON.stringify(customCategories));
        newCategoryInput.value = "";
        renderCategoryOptions();
        render();
    });
    // End Category Logic

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

    // Fix: Timezone-independent Overdue Check
    function isOverdue(task) {
        if (!task.dueDate || task.completed) return false;

        // Compare dates only (YYYY-MM-DD) to avoid timezone issues
        const dueTime = new Date(task.dueDate).getTime(); 
        const today = new Date().toISOString().slice(0, 10);
        const todayTime = new Date(today).getTime(); 

        return dueTime < todayTime; 
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

    // Fix: Select only incomplete tasks
    selectAllBtn.addEventListener("click", () => {
        taskManager.tasks.filter(t => !t.completed).forEach(t => selectedIds.add(t.id));
        render(); // re-render to check boxes
    });
    clearSelectionBtn.addEventListener("click", () => {
        selectedIds.clear();
        render();
    });

    // Fix: Bulk Complete Logic (Uses toggleTaskCompletion for recurrence handling)
    bulkCompleteBtn.addEventListener("click", () => {
        if (!selectedIds.size) return;
        const ids = Array.from(selectedIds);
        
        // 1. Filter only incomplete tasks
        const idsToComplete = ids.filter(id => {
            const task = taskManager.tasks.find(t => t.id === id);
            return task && !task.completed;
        });

        if (idsToComplete.length === 0) {
            selectedIds.clear();
            render();
            return;
        }

        // 2. Use toggleTaskCompletion which correctly handles recurrence without duplication
        idsToComplete.forEach(id => {
            taskManager.toggleTaskCompletion(id);
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
    
    // ⭐ Drag and Drop State and Logic
    
    // Custom Order Save function
    function saveCustomOrder() {
        const taskElements = taskList.querySelectorAll('.task-item');
        const newOrderIds = Array.from(taskElements).map(el => parseInt(el.dataset.taskId));

        // Update the actual taskManager.tasks array based on the new order
        const orderedTasks = [];
        newOrderIds.forEach(id => {
            const task = taskManager.tasks.find(t => t.id === id);
            if (task) {
                orderedTasks.push(task);
            }
        });

        taskManager.tasks = orderedTasks;
        taskManager.saveTasks();
    }

    function setupDragAndDrop() {
        const isCustomSort = sortTasks.value === 'custom';
        // Only enable D&D if 'Custom Order' is selected
        taskList.classList.toggle('draggable', isCustomSort);
        
        if (!isCustomSort) return;

        const items = taskList.querySelectorAll('.task-item');
        items.forEach(item => {
            item.setAttribute('draggable', true);
            
            item.addEventListener('dragstart', (e) => {
                draggedItem = e.currentTarget;
                e.dataTransfer.effectAllowed = 'move';
                e.currentTarget.classList.add('dragging');
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault(); 
                e.dataTransfer.dropEffect = 'move';
                const bounding = e.currentTarget.getBoundingClientRect();
                const offset = bounding.y + (bounding.height / 2);

                // Determine if dragging above or below current item
                e.currentTarget.classList.remove('drag-over-top', 'drag-over-bottom');
                if (e.clientY < offset) {
                    e.currentTarget.classList.add('drag-over-top');
                } else {
                    e.currentTarget.classList.add('drag-over-bottom');
                }
            });
            
            item.addEventListener('dragleave', (e) => {
                e.currentTarget.classList.remove('drag-over-top', 'drag-over-bottom');
            });
            
            item.addEventListener('drop', (e) => {
                e.preventDefault();
                
                e.currentTarget.classList.remove('drag-over-top', 'drag-over-bottom');
                
                if (e.currentTarget === draggedItem) return;

                const targetItem = e.currentTarget;
                const parent = taskList;
                
                if (targetItem.classList.contains('drag-over-top')) {
                    parent.insertBefore(draggedItem, targetItem);
                } else if (targetItem.classList.contains('drag-over-bottom')) {
                    parent.insertBefore(draggedItem, targetItem.nextSibling);
                }

                saveCustomOrder();
            });

            item.addEventListener('dragend', (e) => {
                e.currentTarget.classList.remove('dragging');
                draggedItem = null;
                // Clean up all drag-over classes
                taskList.querySelectorAll('.task-item').forEach(i => 
                    i.classList.remove('drag-over-top', 'drag-over-bottom', 'dragging')
                );
            });
        });
    }

    // ⭐ Task Count Logic
    function updateTaskCounts() {
        const allCount = document.getElementById("allCount");
        const completedCount = document.getElementById("completedCount");
        const overdueCount = document.getElementById("overdueCount");

        const allTasks = taskManager.tasks;

        // Filter: Hide completed recurring tasks from the main view count
        const visibleTasks = allTasks.filter(t => !(t.completed && t.recurrence !== 'none')); 
        
        // Count Logic
        const total = visibleTasks.filter(t => !t.completed).length; // Total incomplete visible tasks
        const done = allTasks.filter(t => t.completed).length; // Total completed tasks (including hidden recurring ones)
        const overdue = visibleTasks.filter(t => !t.completed && isOverdue(t)).length; // Overdue visible tasks

        // UI Update
        allCount.textContent = `All: ${total}`;
        completedCount.textContent = `Done: ${done}`;
        overdueCount.textContent = `Overdue: ${overdue}`;
    }
    // End Task Count Logic


    // main render
    function render() {
        // Start with ALL tasks for accurate sorting and filtering base
        let tasks = taskManager.filterTasks("all"); 
        
        // ⭐ CRITICAL FIX: Filter out completed recurring tasks (Fixes High Priority task bug)
        tasks = tasks.filter(t => !(t.completed && t.recurrence !== 'none')); 

        // 2. Apply filters based on dropdown
        if (filterTasks.value === "completed") {
            tasks = tasks.filter(t => t.completed);
        } else if (filterTasks.value === "incomplete") {
            tasks = tasks.filter(t => !t.completed);
        }

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
            updateTaskCounts();
            setupDragAndDrop();
            return;
        }

        tasks.forEach(task => {
            const item = document.createElement("div");
            item.className = "task-item enter";
            if (task.completed) item.classList.add("task-completed");
            if (isOverdue(task)) item.classList.add("task-overdue");
            item.dataset.taskId = task.id; // ⭐ Drag and Drop Data ID

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
        updateTaskCounts(); // ⭐ Count update
        setupDragAndDrop(); // ⭐ Drag and Drop setup
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
    renderCategoryOptions(); // Initial load of category options
    render();
});