import 'babel-polyfill';
import puppeteer from 'puppeteer'
import genericPool from 'generic-pool'
import initDebug from 'debug'
const debug = initDebug('puppeteer-pool')

const initPuppeteerPool = ({
  initUrl = null,
  // optional. if you set this, this page will be loaded on instance creation
  max = 10,
  // optional. if you set this, make sure to drain() (see step 3)
  min = 2,
  // specifies how long a resource can stay idle in pool before being removed
  idleTimeoutMillis = 30000,
  // specifies the maximum number of times a resource can be reused before being destroyed
  maxUses = 50,
  testOnBorrow = true,
  puppeteerArgs = {},
  validator = () => Promise.resolve(true),
  ...otherConfig
} = {}) => {
  // TODO: randomly destroy old instances to avoid resource leak?
  const factory = {
    create: () => puppeteer.launch(puppeteerArgs).then(async (instance) => {
      if (initUrl) {
        const open_pages = await instance.pages();

        try {
          const page = (open_pages.length !== 0 ? open_pages[0] : await instance.newPage());
          await page.goto(initUrl, { waitUntil: 'networkidle2' });
        } catch (error) {
          throw error;
        }
      }

      instance.useCount = 0
      return instance
    }),
    destroy: (instance) => {
      instance.close()
    },
    validate: (instance) => {
      return validator(instance)
        .then(valid => Promise.resolve(valid && (maxUses <= 0 || instance.useCount < maxUses)))
    },
  }
  const config = {
    max,
    min,
    idleTimeoutMillis,
    testOnBorrow,
    ...otherConfig,
  }
  const pool = genericPool.createPool(factory, config)
  const genericAcquire = pool.acquire.bind(pool)
  pool.acquire = () => genericAcquire().then(instance => {
    instance.useCount += 1
    return instance
  })
  pool.use = (fn) => {
    let resource
    return pool.acquire()
      .then(r => {
        resource = r
        return resource
      })
      .then(fn)
      .then((result) => {
        pool.release(resource)
        return result
      }, (err) => {
        pool.release(resource)
        throw err
      })
  }

  return pool
}

// To avoid breaking backwards compatibility
// https://github.com/binded/phantom-pool/issues/12
initPuppeteerPool.default = initPuppeteerPool

export default initPuppeteerPool
