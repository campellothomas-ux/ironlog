// @vitest-environment happy-dom
import { test, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { KEY } from '../src/storage';
const click=(selector:string)=>{
  const element=document.querySelector<HTMLButtonElement>(selector);
  expect(element,selector).not.toBeNull();element!.click();
};
test('V4 intégrée : annulation, erreur de stockage, réessai et activité unique',async()=>{
  vi.useFakeTimers();
  document.body.innerHTML=readFileSync('index.html','utf8').split('<body>')[1].split('<script')[0];
  const confirm=vi.fn(()=>false);vi.stubGlobal('confirm',confirm);
  await import('../src/main');
  click('[data-a="home-start"]');
  expect(document.querySelector('.page.workout')).not.toBeNull();
  click('[data-a="work-finish"]');
  expect(document.querySelectorAll('.activity')).toHaveLength(0);
  confirm.mockReturnValue(true);
  const before=localStorage.getItem(KEY);
  const write=vi.spyOn(localStorage,'setItem').mockImplementation(()=>{throw new Error('QuotaExceededError');});
  const log=vi.spyOn(console,'error').mockImplementation(()=>{});
  click('[data-a="work-finish"]');
  expect(document.querySelector('[role="status"]')?.textContent).toContain('Enregistrement impossible');
  expect(localStorage.getItem(KEY)).toBe(before);
  expect(document.querySelector('.page.workout')).not.toBeNull();
  write.mockRestore();
  click('[data-a="work-finish"]');
  expect(document.querySelectorAll('#activities-list .activity')).toHaveLength(1);
  const saved=JSON.parse(localStorage.getItem(KEY)!);
  expect(saved.history).toHaveLength(1);
  expect(saved.workout).toBeNull();
  expect(saved.youTab).toBe('activities');
  click('[data-nav="home"]');click('[data-nav="you"]');
  expect(document.querySelectorAll('#activities-list .activity')).toHaveLength(1);
  log.mockRestore();vi.unstubAllGlobals();vi.clearAllTimers();vi.useRealTimers();
});
