import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  setDoc,
  doc
} from "firebase/firestore";

import { db } from "./firebase";


/* ---------------- Initial Data ---------------- */
const initialSprints = [
  {
    id: 1,
    name: "Feb 2026",
    isCurrent: true,
    isCompleted: false,
    tasks: [],
  },
];

/* ---------------- App ---------------- */
export default function App() {
  const [sprints, setSprints] = useState(initialSprints);
  

  //  NEW: selected sprint
  const currentSprint =
    sprints.find(s => s.isCurrent) || sprints[0];

  const [selectedSprintId, setSelectedSprintId] = useState(
    currentSprint?.id
  );

  const selectedSprint =
    sprints.find(s => s.id === selectedSprintId) ||
    currentSprint;

  const [expandedTask, setExpandedTask] = useState(null);
  const [editingQa, setEditingQa] = useState(null);
  const [newSprintName, setNewSprintName] = useState("");

  const [newTask, setNewTask] = useState({
    title: "",
    webOwner: "",
    androidOwner: "",
    iosOwner: "",
    backendOwner: "",
    bllOwner: "",
  });

  const [qaInput, setQaInput] = useState({
    status: "failed",
    remarks: "",
  });
  useEffect(() => {
    const loadSprints = async () => {
      const snap = await getDocs(
        collection(db, "projects/default/sprints")
      );
  
      if (!snap.empty) {
        setSprints(
          snap.docs.map(d => ({
            ...d.data(),
            id: Number(d.id) || d.id,
          }))
        );
      }
    };
  
    loadSprints();
  }, []);

  useEffect(() => {
    const saveSprints = async () => {
      for (const sprint of sprints) {
        await setDoc(
          doc(db, "projects/default/sprints", String(sprint.id)),
          sprint
        );
      }
    };
  
    if (sprints.length) {
      saveSprints();
    }
  }, [sprints]);
  
  


  /* ---------------- Sprint Creation ---------------- */
  const createSprint = () => {
    if (!newSprintName.trim()) return;

    const newId = Date.now();

    setSprints(prev => [
      ...prev.map(sprint => ({ ...sprint, isCurrent: false })),
      {
        id: newId,
        name: newSprintName,
        isCurrent: true,
        tasks: [],
      },
    ]);

    setSelectedSprintId(newId);
    setNewSprintName("");
    setExpandedTask(null);
  };
  /* ---------------- Sprint Completion ---------------- */
const completeSprint = sprintId => {
  setSprints(prev =>
    prev.map(sprint =>
      sprint.id === sprintId
        ? { ...sprint, isCurrent: false, isCompleted: true }
        : sprint
    )
  );
};

const reopenSprint = sprintId => {
  setSprints(prev =>
    prev.map(sprint => {
      if (sprint.id === sprintId) {
        return { ...sprint, isCurrent: true, isCompleted: false };
      }
      if (sprint.isCurrent) {
        return { ...sprint, isCurrent: false };
      }
      return sprint;
    })
  );
};



  /* ---------------- Helpers ---------------- */
  const overallStatus = task => {
    const statuses = Object.values(task.platforms).map(p => p.status);
    if (statuses.includes("in-dev")) return "In Development";
    if (statuses.includes("code-review")) return "In Code Review";
    const lastQa = task.qa.cycles.at(-1);
    return lastQa?.status === "passed" ? "QA Passed" : "QA Pending";
  };

  /* ---------------- Task Actions ---------------- */
  const addTask = sprintId => {
    if (!newTask.title.trim()) return;

    setSprints(prev =>
      prev.map(sprint =>
        sprint.id === sprintId
          ? {
              ...sprint,
              tasks: [
                ...sprint.tasks,
                {
                  id: Date.now(),
                  title: newTask.title,
                  platforms: {
                    web: { owner: newTask.webOwner || "Frontend Dev", status: "todo" },
                    android: { owner: newTask.androidOwner || "Android Dev", status: "todo" },
                    ios: { owner: newTask.iosOwner || "iOS Dev", status: "todo" },
                    backend: { owner: newTask.backendOwner || "Backend Dev", status: "todo" },
                    bll: { owner: newTask.bllOwner || "BLL Dev", status: "todo" },
                  },
                  qa: { cycles: [] },
                },
              ],
            }
          : sprint
      )
    );

    setNewTask({
      title: "",
      webOwner: "",
      androidOwner: "",
      iosOwner: "",
      backendOwner: "",
      bllOwner: "",
    });
  };

  const updatePlatformStatus = (sprintId, taskId, platform, status) => {
    if (!selectedSprint.isCurrent) return;

    setSprints(prev =>
      prev.map(sprint =>
        sprint.id === sprintId
          ? {
              ...sprint,
              tasks: sprint.tasks.map(task =>
                task.id === taskId
                  ? {
                      ...task,
                      platforms: {
                        ...task.platforms,
                        [platform]: {
                          ...task.platforms[platform],
                          status,
                        },
                      },
                    }
                  : task
              ),
            }
          : sprint
      )
    );
  };

  const deleteTask = (sprintId, taskId) => {
    if (!selectedSprint.isCurrent) return;
  
    setSprints(prev =>
      prev.map(sprint =>
        sprint.id === sprintId
          ? {
              ...sprint,
              tasks: sprint.tasks.filter(task => task.id !== taskId),
            }
          : sprint
      )
    );
  
    // If the deleted task was expanded, close it
    if (expandedTask === taskId) {
      setExpandedTask(null);
    }
  };
  

  /* ---------------- QA Actions ---------------- */
  const addQaCycle = (sprintId, taskId) => {
    if (!selectedSprint.isCurrent || !qaInput.remarks.trim()) return;

    setSprints(prev =>
      prev.map(sprint =>
        sprint.id === sprintId
          ? {
              ...sprint,
              tasks: sprint.tasks.map(task =>
                task.id === taskId
                  ? {
                      ...task,
                      qa: {
                        cycles: [
                          ...task.qa.cycles,
                          {
                            cycle: task.qa.cycles.length + 1,
                            status: qaInput.status,
                            remarks: qaInput.remarks,
                          },
                        ],
                      },
                    }
                  : task
              ),
            }
          : sprint
      )
    );

    setQaInput({ status: "failed", remarks: "" });
  };

  const saveQaEdit = (sprintId, taskId, index) => {
    if (!selectedSprint.isCurrent) return;

    setSprints(prev =>
      prev.map(sprint =>
        sprint.id === sprintId
          ? {
              ...sprint,
              tasks: sprint.tasks.map(task =>
                task.id === taskId
                  ? {
                      ...task,
                      qa: {
                        cycles: task.qa.cycles.map((c, i) =>
                          i === index ? { ...c, ...qaInput } : c
                        ),
                      },
                    }
                  : task
              ),
            }
          : sprint
      )
    );

    setEditingQa(null);
    setQaInput({ status: "failed", remarks: "" });
  };

  const deleteQaCycle = (sprintId, taskId, index) => {
    if (!selectedSprint.isCurrent) return;

    setSprints(prev =>
      prev.map(sprint =>
        sprint.id === sprintId
          ? {
              ...sprint,
              tasks: sprint.tasks.map(task =>
                task.id === taskId
                  ? {
                      ...task,
                      qa: {
                        cycles: task.qa.cycles.filter((_, i) => i !== index),
                      },
                    }
                  : task
              ),
            }
          : sprint
      )
    );
  };


  /* ---------------- UI ---------------- */
  return (
    <div className="app">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <h2 className="logo">Sprint Dashboard</h2>

        <input
          placeholder="Sprint name (e.g. Mar 2026)"
          value={newSprintName}
          onChange={e => setNewSprintName(e.target.value)}
        />
        <button className="edit-btn" onClick={createSprint}>
          + Create Sprint
        </button>

        <h4 className="menu-title">Past Sprints</h4>
        <ul className="menu">
          {sprints
            .filter(s => !s.isCurrent)
            .map(sprint => (
              <li
                key={sprint.id}
                className={
                  sprint.id === selectedSprintId ? "active" : ""
                }
                onClick={() => {
                  setSelectedSprintId(sprint.id);
                  setExpandedTask(null);
                }}
              >
                {sprint.name}
              </li>
            ))}
        </ul>
      </aside>

      {/* MAIN CONTENT */}
      <main className="content">
      <div className="sprint-header">
  <h1>
    {selectedSprint.name}
    {selectedSprint.isCurrent && (
      <span className="current-badge">CURRENT</span>
    )}
    {selectedSprint.isCompleted && (
      <span className="completed-badge">COMPLETED</span>
    )}
  </h1>

  {selectedSprint.isCurrent && !selectedSprint.isCompleted && (
    <button
      className="complete-btn subtle"
      onClick={() => completeSprint(selectedSprint.id)}
    >
      Mark Sprint as Completed
    </button>
  )}

  {!selectedSprint.isCurrent && selectedSprint.isCompleted && (
    <button
      className="reopen-btn subtle"
      onClick={() => reopenSprint(selectedSprint.id)}
    >
      Reopen Sprint
    </button>
  )}
</div>



        {/* CREATE TASK – ONLY CURRENT */}
        {selectedSprint.isCurrent && (
          <div className="add-task">
            <input
              placeholder="Task title"
              value={newTask.title}
              onChange={e =>
                setNewTask({ ...newTask, title: e.target.value })
              }
            />
            <input
              placeholder="Web owner"
              value={newTask.webOwner}
              onChange={e =>
                setNewTask({ ...newTask, webOwner: e.target.value })
              }
            />
            <input
              placeholder="Android owner"
              value={newTask.androidOwner}
              onChange={e =>
                setNewTask({ ...newTask, androidOwner: e.target.value })
              }
            />
            <input
              placeholder="iOS owner"
              value={newTask.iosOwner}
              onChange={e =>
                setNewTask({ ...newTask, iosOwner: e.target.value })
              }
            />
            <input
              placeholder="Backend owner"
              value={newTask.backendOwner}
              onChange={e =>
                setNewTask({ ...newTask, backendOwner: e.target.value })
              }
            />
            <input
              placeholder="BLL owner"
              value={newTask.bllOwner}
              onChange={e =>
                setNewTask({ ...newTask, bllOwner: e.target.value })
              }
            />
            <button
              className="edit-btn"
              onClick={() => addTask(selectedSprint.id)}
            >
              + Add Task
            </button>
          </div>
        )}

        {/* TASKS TABLE (UNCHANGED LOGIC) */}
        <table className="task-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Task</th>
              <th>Overall Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {selectedSprint.tasks.map((task, index) => {
              const active = expandedTask === task.id;

              return (
                <>
                  <tr key={task.id} className={active ? "active-task" : ""}>
                    <td>
                      <span className="task-index">{index + 1}</span>
                    </td>
                    <td>{task.title}</td>
                    <td>{overallStatus(task)}</td>
                    <td>
                      <button
                        className="link-btn"
                        onClick={() =>
                          setExpandedTask(active ? null : task.id)
                        }
                      >
                        {active ? "Hide" : "View Details"}
                      </button>
                      {selectedSprint.isCurrent && (
    <button
      className="delete-btn"
      onClick={() =>
        deleteTask(selectedSprint.id, task.id)
      }
    >
      🗑
    </button>
  )}

                    </td>
                  </tr>

                  {active && (
                    <tr className="expanded-row">
                      <td colSpan="4">
                        {/* DEV */}
                        <div className="detail-section">
                          <h4>Development – Task #{index + 1}</h4>
                          <table className="inner-table">
                            <thead>
                              <tr>
                                <th>Platform</th>
                                <th>Owner</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(task.platforms).map(
                                ([p, info]) => (
                                  <tr key={p}>
                                    <td>
                                      <span
                                        className={`platform-badge ${p}`}
                                      >
                                        {p.toUpperCase()}
                                      </span>
                                    </td>
                                    <td>{info.owner}</td>
                                    <td>
                                      <select
                                        value={info.status}
                                        disabled={!selectedSprint.isCurrent}
                                        onChange={e =>
                                          updatePlatformStatus(
                                            selectedSprint.id,
                                            task.id,
                                            p,
                                            e.target.value
                                          )
                                        }
                                      >
                                        <option value="todo">To Do</option>
                                        <option value="in-dev">In Dev</option>
                                        <option value="code-review">
                                          Code Review
                                        </option>
                                        <option value="done">Done</option>
                                        <option value="NA">NA</option>
                                      </select>
                                    </td>
                                  </tr>
                                )
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* QA */}
                        <div className="detail-section qa-section">
                          <h4>QA Cycles</h4>

                          <table className="inner-table">
                            <thead>
                              <tr>
                                <th>Cycle</th>
                                <th>Status</th>
                                <th>Remarks</th>
                                <th />
                              </tr>
                            </thead>
                            <tbody>
                              {task.qa.cycles.map((c, i) => {
                                const editing =
                                  editingQa?.taskId === task.id &&
                                  editingQa?.index === i;

                                return (
                                  <tr key={i}>
                                    <td>Cycle {c.cycle}</td>
                                    <td>
                                      {editing ? (
                                        <select
                                          value={qaInput.status}
                                          onChange={e =>
                                            setQaInput({
                                              ...qaInput,
                                              status: e.target.value,
                                            })
                                          }
                                        >
                                          <option value="failed">
                                            Failed
                                          </option>
                                          <option value="passed">
                                            Passed
                                          </option>
                                        </select>
                                      ) : (
                                        <span
                                          className={`qa-status ${c.status}`}
                                        >
                                          {c.status}
                                        </span>
                                      )}
                                    </td>
                                    <td>
                                      {editing ? (
                                        <input
                                          value={qaInput.remarks}
                                          onChange={e =>
                                            setQaInput({
                                              ...qaInput,
                                              remarks: e.target.value,
                                            })
                                          }
                                        />
                                      ) : (
                                        c.remarks
                                      )}
                                    </td>
                                    <td>
                                      {selectedSprint.isCurrent &&
                                        (editing ? (
                                          <button
                                            className="link-btn"
                                            onClick={() =>
                                              saveQaEdit(
                                                selectedSprint.id,
                                                task.id,
                                                i
                                              )
                                            }
                                          >
                                            Save
                                          </button>
                                        ) : (
                                          <>
                                            <button
                                              className="link-btn"
                                              onClick={() => {
                                                setEditingQa({
                                                  taskId: task.id,
                                                  index: i,
                                                });
                                                setQaInput({
                                                  status: c.status,
                                                  remarks: c.remarks,
                                                });
                                              }}
                                            >
                                              Edit
                                            </button>
                                            <button
                                              className="delete-btn"
                                              onClick={() =>
                                                deleteQaCycle(
                                                  selectedSprint.id,
                                                  task.id,
                                                  i
                                                )
                                              }
                                            >
                                              🗑
                                            </button>
                                          </>
                                        ))}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>

                          {/* ADD QA */}
                          {selectedSprint.isCurrent && (
                            <div className="qa-add">
                              <select
                                value={qaInput.status}
                                onChange={e =>
                                  setQaInput({
                                    ...qaInput,
                                    status: e.target.value,
                                  })
                                }
                              >
                                <option value="failed">Failed</option>
                                <option value="passed">Passed</option>
                              </select>
                              <input
                                placeholder="QA remarks"
                                value={qaInput.remarks}
                                onChange={e =>
                                  setQaInput({
                                    ...qaInput,
                                    remarks: e.target.value,
                                  })
                                }
                              />
                              <button
                                className="edit-btn"
                                onClick={() =>
                                  addQaCycle(selectedSprint.id, task.id)
                                }
                              >
                                + Add Cycle
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>

        {!selectedSprint.isCurrent && (
          <div className="readonly-note">
            This sprint is read-only
          </div>
        )}
      </main>
    </div>
  );
}
