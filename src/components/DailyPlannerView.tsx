import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle2, Circle, Clock } from 'lucide-react';
import { api } from '../services/api';
import type { RoutineTask } from '../types/breathewise';

interface DailyPlannerViewProps {
  locationKey: string;
}

export const DailyPlannerView: React.FC<DailyPlannerViewProps> = ({ locationKey }) => {
  const [tasks, setTasks] = useState<RoutineTask[]>([]);
  const [meta, setMeta] = useState<{ planDate: string; city: string; aqi: number | null; category: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState<'All' | RoutineTask['priority']>('All');

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .getPlanner()
      .then((res) => {
        if (!active) return;
        setTasks(res.tasks);
        setMeta({
          planDate: res.planDate,
          city: res.location.name,
          aqi: res.aqi,
          category: res.category,
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [locationKey]);

  async function toggleTask(task: RoutineTask) {
    const next = !task.completed;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed: next } : t)));
    await api.updatePlannerTask(task.id, next, task.reminderTime);
  }

  async function updateReminder(task: RoutineTask, reminderTime: string) {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, reminderTime } : t)));
    await api.updatePlannerTask(task.id, task.completed, reminderTime);
  }

  const completedCount = tasks.filter((t) => t.completed).length;
  const visibleTasks = priorityFilter === 'All' ? tasks : tasks.filter((t) => t.priority === priorityFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-[#E2E8E4] pb-6 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-medium text-[#546860]">
            {meta?.planDate ?? 'Today'} · {meta?.city ?? 'Active location'} · Current AQI{' '}
            <span className="font-mono tabular-nums">{meta?.aqi ?? '—'}</span> ({meta?.category ?? 'Loading'})
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#13231D]">Personalized Daily Routine Planner</h1>
          <p className="mt-1 text-sm text-[#4A5D55]">
            Every schedule block evaluates your actual hourly outdoor AQI forecast—never assuming morning or afternoon is safe by default.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="block text-xs text-[#5E726A]">Completed Today</span>
            <span className="font-mono text-lg font-semibold text-[#165B43] tabular-nums">
              {completedCount} / {tasks.length}
            </span>
          </div>
          <div className="inline-flex rounded-lg bg-[#F1F5F2] p-1" role="tablist" aria-label="Filter routine by priority">
            {(['All', 'Critical', 'High', 'Recommended'] as const).map((p) => (
              <button
                key={p}
                type="button"
                role="tab"
                aria-selected={priorityFilter === p}
                onClick={() => setPriorityFilter(p)}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  priorityFilter === p ? 'bg-white text-[#13231D] shadow-sm' : 'text-[#546860] hover:text-[#13231D]'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-[#E7ECE8]" />
          ))}
        </div>
      ) : (
        <div className="divide-y divide-[#E6ECE8] rounded-xl border border-[#DCE3DE] bg-white">
          {visibleTasks.map((task) => (
            <div
              key={task.id}
              className={`flex flex-col gap-4 p-5 transition-colors sm:flex-row sm:items-start sm:justify-between ${
                task.completed ? 'bg-[#F8FAF9]' : 'bg-white'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <button
                  type="button"
                  onClick={() => toggleTask(task)}
                  aria-label={`Mark ${task.timeBlock} routine ${task.completed ? 'incomplete' : 'complete'}`}
                  className="mt-0.5 shrink-0 text-[#165B43] transition-transform hover:scale-105"
                >
                  {task.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-[#165B43]" />
                  ) : (
                    <Circle className="h-5 w-5 text-[#8A9D95]" />
                  )}
                </button>
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#5E726A]">
                    <span className="font-semibold text-[#13231D]">{task.timeBlock}</span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                      <Clock className="h-3 w-3" />
                      {task.scheduledWindow}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={`font-semibold ${
                        task.priority === 'Critical'
                          ? 'text-[#B91C1C]'
                          : task.priority === 'High'
                            ? 'text-[#B53D0A]'
                            : 'text-[#165B43]'
                      }`}
                    >
                      {task.priority} priority
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-[#4A5D55]">{task.forecastAqiRange}</span>
                  </div>

                  <h2
                    className={`text-sm font-semibold ${
                      task.completed ? 'text-[#6B7E76] line-through' : 'text-[#13231D]'
                    }`}
                  >
                    {task.title}
                  </h2>

                  <p className="text-xs leading-relaxed text-[#4A5D55]">{task.rationale}</p>
                  <p className="text-xs text-[#2D4039]">
                    <span className="font-medium text-[#165B43]">Safer alternative:</span> {task.alternativeActivity}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pl-8 sm:pl-0">
                <Bell className="h-3.5 w-3.5 text-[#6B7E76]" />
                <label htmlFor={`reminder-${task.id}`} className="sr-only">
                  Reminder time for {task.timeBlock}
                </label>
                <input
                  id={`reminder-${task.id}`}
                  type="time"
                  value={task.reminderTime}
                  onChange={(e) => updateReminder(task, e.target.value)}
                  className="rounded-md border border-[#D4DDD7] bg-[#FAFBFA] px-2 py-1 font-mono text-xs text-[#13231D] tabular-nums focus:border-[#165B43] focus:outline-none"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
