'use client';

import Link from 'next/link';
import styles from './subnet-game.module.css';
import { useRef, useState } from 'react';
import { isCorrect, newProblem, prefixes, solve, type Problem, type Version } from './subnet';

const button = 'rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600';

export default function SubnetGame() {
  const [problem, setProblem] = useState<Problem>({version: 4, address: '172.16.35.142', prefix: 22});
  const [prefix, setPrefix] = useState('random');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [checkedRows, setCheckedRows] = useState<string[]>([]);
  const [shown, setShown] = useState<string[]>([]);
  const [autoCheck, setAutoCheck] = useState(false);
  const [round, setRound] = useState(1);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const {rows, hostBits} = solve(problem);
  const correct = rows.filter(row => isCorrect(answers[row.id] ?? '', row.value, problem.version, row.id === 'count')).length;
  const allShown = shown.length === rows.length;

  function next(version = problem.version, selection = prefix) {
    setProblem(newProblem(version, selection === 'random' ? undefined : Number(selection)));
    setAnswers({}); setChecked(false); setCheckedRows([]); setShown([]); setRound(n => n + 1);
    inputs.current[0]?.focus();
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 text-slate-900 sm:px-6 sm:py-8">
      <nav className="mb-6 flex items-center justify-between text-sm">
        <Link href="/" className="font-semibold text-slate-600 hover:text-blue-700">← Brandon Stryker</Link>
        <span className="text-slate-500">Networking lab</span>
      </nav>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-6">
        <div>
          
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Subnetting practice</h1>
          <p className="mt-2 text-sm text-slate-600">Practice IPv4 and IPv6, one subnet at a time.</p>
        </div>
        <div className="flex rounded-2xl border border-slate-200 bg-slate-100 p-1" role="group" aria-label="IP version">
          {([4, 6] as Version[]).map(version => <button key={version} aria-pressed={problem.version === version} onClick={() => { if (version !== problem.version) { setPrefix('random'); next(version, 'random'); } }} className={`rounded-lg px-5 py-2 text-sm font-bold focus-visible:outline-blue-600 ${problem.version === version ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>IPv{version}</button>)}
        </div>
      </div>

      <section aria-label="Practice problem" className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className={styles.workspace}>
        <div className={styles.instructions}>
          {problem.version === 4 ? 'For each target IP, solve the network address, first host, last host, broadcast, and next subnet. Practice uses /8–/30.' : 'Find the IPv6 block boundaries and address count. IPv6 has no broadcast. These are mathematical ranges, not a list of assignable hosts. Compressed or expanded addresses are accepted.'}
          <p className="mt-1">Need help? Expand the step-by-step solutions below.</p>
        </div>
        <div className={styles.target}>
          <span className="text-sm font-semibold">Target IP address</span>
          <code className={styles.targetAddress}>{problem.address} /{problem.prefix}</code>
          <button onClick={() => next()} className={`${button} !rounded-md !border-blue-700 !bg-blue-700 !px-3 !py-1.5 !text-white hover:!bg-blue-800`}>Next problem</button>
        </div>
        <div className={styles.tableScroll}>
        <table className={`${styles.table} ${problem.version === 6 ? styles.ipv6 : ''}`}>
          <thead><tr><th scope="col"><span className="sr-only">Task</span></th><th scope="col">IP address</th><th scope="col">Correct?</th><th scope="col">Answer</th><th scope="col">Show</th></tr></thead>
          <tbody>
        {rows.map((row, index) => {
          const value = answers[row.id] ?? '';
          const valid = isCorrect(value, row.value, problem.version, row.id === 'count');
          const status = (checked || checkedRows.includes(row.id) || (autoCheck && value.length > 0)) ? (valid ? 'Correct' : value ? 'Try again' : 'Enter an answer') : 'Not checked';
          return <tr key={`${problem.version}-${row.id}`}>
            <th scope="row"><label htmlFor={`answer-${row.id}`}>{row.label}</label></th>
            <td>
            <input ref={el => {inputs.current[index] = el;}} id={`answer-${row.id}`} aria-describedby={`status-${row.id}`} aria-invalid={status === 'Try again'} value={value} onChange={e => {setAnswers(a => ({...a, [row.id]: e.target.value}));}} onKeyDown={e => {if (e.key === 'Enter') {e.preventDefault(); if (!checked) setChecked(true); else if (!allShown) setShown(rows.map(r => r.id)); else next();}}} autoComplete="off" autoCapitalize="none" spellCheck={false} inputMode={row.id === 'count' || problem.version === 4 ? 'decimal' : 'text'} placeholder={row.id === 'count' ? 'Decimal address count' : problem.version === 4 ? 'e.g. 192.168.1.0' : 'e.g. 2001:db8::'} className={`w-full min-w-0 rounded-md border bg-white px-2 py-1.5 text-center font-mono text-sm outline-none focus:ring-2 focus:ring-blue-500 ${status === 'Correct' ? 'border-emerald-500' : status === 'Try again' ? 'border-rose-400' : 'border-slate-300'}`} />
            </td><td><span id={`status-${row.id}`} className={`text-xs font-semibold ${status === 'Correct' ? 'text-emerald-700' : status === 'Try again' ? 'text-rose-700' : 'text-slate-500'}`}>{status === 'Not checked' ? '—' : status === 'Correct' ? '✓' : status}<span className="sr-only">{status === 'Correct' || status === 'Not checked' ? status : ''}</span></span><button type="button" onClick={() => setCheckedRows(ids => ids.includes(row.id) ? ids : [...ids, row.id])} aria-label={`Check Answer: ${row.label}`} className={styles.checkButton}>Check Answer</button></td>
            <td><code className={styles.solution}>{shown.includes(row.id) ? row.value : '—'}</code></td>
            <td><button onClick={() => setShown(s => s.includes(row.id) ? s.filter(id => id !== row.id) : [...s, row.id])} aria-label={`${shown.includes(row.id) ? 'Hide' : 'Show'} ${row.label.toLowerCase()}`} className={styles.showButton}>{shown.includes(row.id) ? 'Hide' : 'Show'}</button></td>
          </tr>;
        })}
          </tbody>
        </table>
        </div>
        <div className={styles.controls}>
          <button onClick={() => setShown(rows.map(r => r.id))} className={`${button} !rounded-md !px-3 !py-1.5`}>Show all</button>
          <button onClick={() => setChecked(true)} className={`${button} !rounded-md !border-emerald-700 !bg-emerald-700 !px-3 !py-1.5 !text-white hover:!bg-emerald-800`}>Check all</button>
          <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={autoCheck} onChange={e => setAutoCheck(e.target.checked)} className="h-4 w-4 accent-blue-700" />Auto-check</label>
          <label className="flex items-center gap-2 text-sm text-slate-600">Prefix
            <select aria-label="Prefix length" value={prefix} onChange={e => {setPrefix(e.target.value); next(problem.version, e.target.value);}} className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800">
              <option value="random">Mixed practice</option>
              {prefixes[problem.version].map(p => <option key={p} value={p}>/{p}</option>)}
            </select>
          </label>
        </div>
        <p role="status" className="pb-1 text-center text-xs text-slate-500">Problem {round} · {checked || autoCheck || checkedRows.length > 0 ? `${correct} of ${rows.length} correct${correct === rows.length ? ' — nicely done! Ready for the next problem?' : '. Keep going, or open a walkthrough below.'}` : 'Enter your answers, then check your work.'}{shown.length > 0 ? ' Solutions revealed for this problem.' : ''}</p>
        </div>
      </section>

      <details className="group mt-4 rounded-2xl border border-slate-200 bg-white">
        <summary className="cursor-pointer rounded-2xl p-4 text-sm font-semibold focus-visible:outline-blue-600">Need a hand? Step-by-step help <span className="ml-2 text-sm font-normal text-slate-500">Worked solutions for this problem</span></summary>
        <div className="space-y-4 border-t border-slate-100 p-5 sm:p-6">
          <p className="text-sm leading-6 text-slate-600">A /{problem.prefix} prefix fixes the first {problem.prefix} bits. The remaining {hostBits} bits vary inside the block. Open any task below to see its calculation and answer.</p>
          {rows.map(row => <details key={`${problem.address}-${problem.prefix}-${row.id}`} className="rounded-xl border border-slate-200 bg-slate-50"><summary className="cursor-pointer p-4 text-sm font-semibold">{row.label}</summary><ol className="list-decimal space-y-3 pb-5 pl-10 pr-5 text-sm leading-6 text-slate-600">{row.steps.map((step, i) => <li className="break-words" key={i}>{step}</li>)}</ol></details>)}
          {problem.version === 6 && <p className="text-sm leading-6 text-slate-600">IPv6 notation: omit leading zeros in a hextet; use :: once to replace consecutive zero hextets. For example, 2001:0db8:0000:0000:0000:0000:0000:0001 = 2001:db8::1. See the <a className="text-blue-700 underline" href="https://www.rfc-editor.org/rfc/rfc4291.html">IPv6 addressing specification</a> for address types and reservations.</p>}
        </div>
      </details>
      <p className="mt-5 text-center text-xs leading-6 text-slate-500">Keyboard: Tab moves between fields. Enter in an answer cycles through Check all → Show all → Next problem.</p>
    </main>
  );
}
