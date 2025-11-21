// Clave para guardar en localStorage
const STORAGE_KEY = "planificador_lucas_tareas_v3";

let tasks = []; // acá guardamos todas las tareas en memoria

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("task-form");
  const todayText = document.getElementById("today-text");
  const aiForm = document.getElementById("ai-form");

  // === Tema (claro / oscuro) ===
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark");
  }
  const themeIcon = document.getElementById("theme-icon");
  if (themeIcon) {
    themeIcon.textContent = document.body.classList.contains("dark")
      ? "☀️"
      : "🌙";
  }

  // Mostrar fecha de hoy
  const today = new Date();
  const opcionesFecha = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  todayText.textContent =
    "Hoy es " + today.toLocaleDateString("es-AR", opcionesFecha);

  // Cargar tareas guardadas
  tasks = loadTasks();
  renderTasks();

  // Manejar envío del formulario de tareas
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    addTaskFromForm();
  });

  // Manejar clicks en listas (checkbox y borrar)
  const taskListsContainer = document.getElementById("task-lists");
  taskListsContainer.addEventListener("click", (e) => {
    const taskElement = e.target.closest(".task");
    if (!taskElement) return;
    const id = parseInt(taskElement.dataset.id);

    // Toggle checkbox
    if (e.target.matches('input[type="checkbox"]')) {
      toggleTaskDone(id, e.target.checked);
    }

    // Botón borrar
    if (e.target.matches(".btn-small")) {
      deleteTask(id);
    }
  });

  // Manejar el asistente IA local
  if (aiForm) {
    aiForm.addEventListener("submit", (e) => {
      e.preventDefault();
      handleAISuggestion();
    });
  }
});

// ============ Tema claro / oscuro ============

function toggleTheme() {
  const isDark = document.body.classList.toggle("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");

  const icon = document.getElementById("theme-icon");
  if (!icon) return;

  icon.style.opacity = 0;
  setTimeout(() => {
    icon.textContent = isDark ? "☀️" : "🌙";
    icon.style.opacity = 1;
  }, 150);
}

// ============ Manejo de tareas ============

function loadTasks() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function addTaskFromForm() {
  const titleInput = document.getElementById("title");
  const typeInput = document.getElementById("type");
  const dateInput = document.getElementById("date");
  const timeInput = document.getElementById("time");
  const quantityInput = document.getElementById("quantity");
  const notesInput = document.getElementById("notes");

  const title = titleInput.value.trim();
  let type = typeInput.value.trim();

  if (!title) return;
  if (!type) type = "General";

  const newTask = {
    id: Date.now(),
    title: title,
    type: type,
    date: dateInput.value || null,
    time: timeInput.value || null,
    quantity: quantityInput.value ? Number(quantityInput.value) : null,
    notes: notesInput.value.trim() || null,
    done: false,
  };

  tasks.push(newTask);
  saveTasks();
  renderTasks();

  // Limpiar formulario
  titleInput.value = "";
  dateInput.value = "";
  timeInput.value = "";
  quantityInput.value = "";
  notesInput.value = "";
  titleInput.focus();
}

function toggleTaskDone(id, checked) {
  tasks = tasks.map((t) => (t.id === id ? { ...t, done: checked } : t));
  saveTasks();
  renderTasks();
}

function deleteTask(id) {
  const confirmar = confirm("¿Seguro que querés eliminar esta tarea?");
  if (!confirmar) return;

  tasks = tasks.filter((t) => t.id !== id);
  saveTasks();
  renderTasks();
}

function renderTasks() {
  const container = document.getElementById("task-lists");
  container.innerHTML = "";

  if (!tasks.length) {
    container.innerHTML =
      '<p style="font-size:0.85rem;color:var(--text-muted);">Todavía no agregaste tareas. Empezá creando una en el formulario de arriba 👆</p>';
    return;
  }

  // Orden: primero pendientes, luego hechas; dentro, por horario si hay
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.done && !b.done) return 1;
    if (!a.done && b.done) return -1;
    if (a.time && b.time) return a.time.localeCompare(b.time);
    return 0;
  });

  // Agrupar por type
  const groups = {};
  for (const task of sortedTasks) {
    const type = task.type || "General";
    if (!groups[type]) groups[type] = [];
    groups[type].push(task);
  }

  const types = Object.keys(groups).sort((a, b) =>
    a.localeCompare(b, "es", { sensitivity: "base" })
  );

  for (const type of types) {
    const column = document.createElement("article");
    column.className = "task-column";

    const tasksForType = groups[type];

    column.innerHTML = `
      <div class="task-column-header">
        <h2>${escapeHtml(type)}</h2>
        <p class="column-subtitle">${tasksForType.length} tarea(s)</p>
      </div>
      <div class="task-list"></div>
    `;

    const listDiv = column.querySelector(".task-list");

    for (const task of tasksForType) {
      listDiv.appendChild(createTaskElement(task));
    }

    container.appendChild(column);
  }
}

function createTaskElement(task) {
  const div = document.createElement("div");
  div.className = "task" + (task.done ? " done" : "");
  div.dataset.id = task.id;

  let metaParts = [];
  if (task.time) metaParts.push("Hora: " + task.time);
  if (task.date) metaParts.push("Fecha: " + task.date);
  if (task.quantity !== null) metaParts.push("Cantidad: " + task.quantity);

  const metaText = metaParts.join(" · ");

  div.innerHTML = `
    <div class="task-header">
      <input type="checkbox" ${task.done ? "checked" : ""} />
      <span class="task-title">${escapeHtml(task.title)}</span>
    </div>
    ${metaText ? `<div class="task-meta">${escapeHtml(metaText)}</div>` : ""}
    ${
      task.notes
        ? `<div class="task-notes">${escapeHtml(task.notes)}</div>`
        : ""
    }
    <div class="task-actions">
      <button type="button" class="btn-small">Borrar</button>
    </div>
  `;

  return div;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ============ "IA" LOCAL DE RUTINAS ============

function handleAISuggestion() {
  const goal = document.getElementById("ai-goal").value;
  const start = document.getElementById("ai-start").value;
  const end = document.getElementById("ai-end").value;
  const days = document.getElementById("ai-days").value;
  const notes = document.getElementById("ai-notes").value.trim();
  const output = document.getElementById("ai-output");

  if (!goal || !start || !end) {
    output.innerHTML =
      '<p class="ai-message">Completá objetivo, horario desde y hasta.</p>';
    return;
  }

  const startMin = timeToMinutes(start);
  const endMin = timeToMinutes(end);
  if (endMin <= startMin) {
    output.innerHTML =
      '<p class="ai-message">El horario final tiene que ser mayor al inicial 😉</p>';
    return;
  }

  const totalMin = endMin - startMin;
  const plan = buildPlan(goal, totalMin, days, notes);

  output.innerHTML = `
    <div class="ai-message">
      ${plan}
      <p style="margin-top:6px;font-size:0.75rem;color:var(--text-muted);">
        💡 Tip: tomá cada bloque que te sirva y cargalo como tarea en el tablero (por ejemplo <strong>Sección: Rutina de hoy</strong> o <strong>Estudio</strong>).
      </p>
    </div>
  `;
}

function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function buildPlan(goal, totalMin, days, notes) {
  let intensidad = "moderada";
  if (totalMin < 40) intensidad = "rápida";
  if (totalMin > 90) intensidad = "larga";

  const horas = (totalMin / 60).toFixed(1).replace(".", ",");

  const contextoExtra = notes
    ? `<p><strong>Contexto que me contaste:</strong> ${escapeHtml(
        notes
      )}</p>`
    : "";

  let bloques = "";

  if (goal === "salud") {
    bloques = `
      <h3>Propuesta de rutina de salud (${horas} h · intensidad ${intensidad})</h3>
      <ul>
        <li>5–10 min de movilidad articular y entrada en calor.</li>
        <li>${totalMin > 45 ? "25–30" : "15–20"} min de fuerza (flexiones, sentadillas, core).</li>
        <li>${totalMin > 60 ? "20–25" : "10–15"} min de trabajo cardiovascular suave (caminata rápida, bici, trote suave).</li>
        <li>5–10 min de estiramientos y respiración para bajar.</li>
      </ul>
    `;
  } else if (goal === "estudio") {
    bloques = `
      <h3>Propuesta de rutina de estudio (${horas} h · intensidad ${intensidad})</h3>
      <ul>
        <li>1 bloque de 25 min de foco total (sin celular) + 5 min de pausa.</li>
        <li>${
          totalMin > 60
            ? "2º bloque de 25 + 5 min, ideal para otra materia o repaso."
            : "Repaso corto de 10–15 min de lo visto."
        }</li>
        <li>Últimos 10–15 min para hacer un mini resumen o lista de dudas.</li>
      </ul>
    `;
  } else if (goal === "productividad") {
    bloques = `
      <h3>Propuesta de rutina de productividad personal (${horas} h)</h3>
      <ul>
        <li>10 min para listar tareas del día (trabajo, casa, trámites, estudio).</li>
        <li>${
          totalMin > 60
            ? "2 bloques de 25 min de trabajo profundo + 5 min de pausa cada uno."
            : "1 bloque de 25 min de trabajo profundo + 5 min de pausa."
        }</li>
        <li>Tiempo restante para tareas mecánicas: mails, ordenar, preparar cosas para mañana.</li>
      </ul>
    `;
  } else if (goal === "mixto") {
    bloques = `
      <h3>Propuesta de rutina mixta (salud + estudio) · ${horas} h</h3>
      <ul>
        <li>15–20 min de fuerza + movilidad (flexiones, core, algo de pierna).</li>
        <li>1 bloque de 25 min de estudio + 5 min de pausa.</li>
        ${
          totalMin > 70
            ? "<li>Segundo bloque de 25 min de estudio o repaso, según cómo te sientas.</li>"
            : ""
        }
        <li>5–10 min finales para estirar, respirar y planear el día siguiente.</li>
      </ul>
    `;
  }

  let diasTexto = "todos los días que elijas";
  if (days === "lunes-viernes") diasTexto = "de lunes a viernes";
  if (days === "fin-de-semana") diasTexto = "los fines de semana";

  return `
    ${contextoExtra}
    <p><strong>Tiempo disponible:</strong> ${horas} h ${diasTexto}.</p>
    ${bloques}
  `;
}
