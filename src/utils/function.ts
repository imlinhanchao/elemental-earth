/** noop */
export const noop = (..._args: any[]) => {};

/** 克隆 */
export const clone = (data: any) => {
  if (typeof data === 'object') return JSON.parse(JSON.stringify(data));
  return data;
};

/** 延时操作 */
export const sleep = (secs = 1, data?: any) =>
  new Promise((resolve) => setTimeout(() => resolve(data), secs * 1000));

/** 执行一次 */
export const once = <T extends (...args: any[]) => any>(fn: T): T =>
  ((ran = false) => ((...args) => (ran ? fn : ((ran = !ran), (fn = fn(...args))))) as T)();

/**
 * 轮询时长timeout，直到轮询fn函数返回非空
 */
export const waitUntil = (fn: Fn, timeout = 15000, interval = 150) => {
  let count = 0;

  let resolve: Fn;
  let reject: Fn;
  const promise = new Promise((res, rej) => ((resolve = res), (reject = rej)));

  const executor = async () => {
    const res = await fn();
    if (res) {
      clearInterval(intervalID);
      resolve(res);
    } else {
      if (++count * interval >= timeout) {
        clearInterval(intervalID);
        reject(new Error('waitUntil 超时'));
      }
    }
  };
  const intervalID = setInterval(executor, interval);
  executor();

  return promise;
};

/**
 * `box`函数是一个允许链接异步的实现。
 * @param [expFn] - expFn 是可选参数，表示返回值的表达式或函数。
 * @example
 * const b = box(sleep(1, 'start')); // const b = box(() => sleep(1, 'start'));
 * const b2 = b.next(async (val) => await sleep(2, 'step1 - ' + val));
 * b2.done((val) => console.log('done: ', val)); // done:  step1 - start
 */
export const box = (expFn?: Fn | any) => ({
  next: (fn: Fn) =>
    box(
      typeof expFn === 'function'
        ? async () => await fn(await expFn())
        : (async () => await fn(await expFn))(),
    ),
  done: async (fn: Fn) => await fn(typeof expFn === 'function' ? await expFn() : await expFn),
});

/**
 * “observable”函数创建一个可观察对象，使用管道函数订阅和转换该对象。
 * @param subscribe - 将回调函数作为参数并返回值的函数。每当可观察对象发出新值时，就会调用此回调函数。
 * @returns “observable”函数返回一个具有两个属性的对象：“subscribe”和“pipe”。
 * @example
 * const ob = observable((callback) => document.addEventListener("mouseover", callback));
 * ob.pipe(ev => ev.clientX).subscribe((v) => console.log('done: ', v));
 */
export const observable = (subscribe: Fn<Fn, any>) => ({
  subscribe,
  pipe(pipeFn: Fn) {
    return observable((cbFn) => this.subscribe((val) => cbFn(pipeFn(val))));
  },
});

/**
 * `tryFn` 函数，它将另一个函数包装在 try-catch 块中，并允许在失败时重试该函数指定的次数。
 * @param {Fn} fn - `fn` 参数是将要执行的函数。它可以接受任意数量的参数，这些参数由“...args”参数指定。
 * @param [count=1] - “count”参数是一个可选参数，它指定函数“fn”在抛出错误时应重试的次数。默认情况下，它设置为 1，这意味着如果函数抛出错误，将重试一次。
 */
export const tryFn =
  (fn: Fn, count = 1) =>
  (...args: Parameters<typeof fn>) =>
    new Promise((resolve, reject) =>
      (async function _t() {
        count -= 1;
        try {
          resolve(await fn(...args));
        } catch (error) {
          if (count <= 0) return reject(error);

          _t();
        }
      })(),
    );

/**
 * `try$` 函数，可让您安全地执行函数并处理可能发生的任何错误。
 * @param {Fn} fn - 参数“fn”是将要执行的函数。
 * @param args - `args` 参数是一个剩余参数，允许您将任意数量的参数传递给 `try$` 函数。这些参数将被分散到函数内名为“args”的数组中。
 * @example try$(() => { throw 'throw'; })
 */
export const try$ = async (fn: Fn, ...args: Parameters<typeof fn>) => await tryFn(fn)(...args);