import axios from 'axios'
import { accessSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import cheerio from 'cheerio'
import sleep from '../utils/sleep'

const __dirname = dirname(decodeURI(new URL(import.meta.url).pathname))

export default function createParser (bookName) {
  const wuxiaUrl =  'https://m.wuxiaworld.co'
  const instance = axios.create({
    baseURL: wuxiaUrl,
    timeout: 10000
  })
  const cacheDir = join(__dirname, `../../.cache/${bookName}`)
  const indexFilePath = join(cacheDir, 'index.html')
  const chapterListFilePath = join(cacheDir, 'all.html')

  return {
    async getIndex () {
      const { data } = await instance.get(`/${bookName}/`)

      try {
        mkdirSync(cacheDir)
      } catch (err) {
        if (err.code !== 'EEXIST') throw err
      }
      writeFileSync(indexFilePath, data)

      return data
    },
    parseIndex () {
      const indexFile = readFileSync(indexFilePath).toString()
      const $ = cheerio.load(indexFile)

      function getValue (node) {
        if (!node) return null
        const text = node.text()
        if (!text) return null
        const [, value] = text.trim().split('：')

        return value || null
      }

      const res = {
        title: $('.title').text(),
        coverUrl: $('.synopsisArea_detail>img').attr('src'),
        category: getValue($('.sort')),
        status: getValue($('.sort').next()),
        updatedAt: getValue($('.sort').next().next()),
        author: getValue($('.author')),
        description: $('.review').remove('strong').text()
        .trim().replace('Description\n', '')
      }

      return res
    },
    async getChapterList () {
      const { data } = await instance.get(`/${bookName}/all.html`)

      try {
        mkdirSync(cacheDir)
      } catch (err) {
        if (err.code !== 'EEXIST') throw err
      }
      writeFileSync(chapterListFilePath, data)

      return data
    },
    parseChapterList () {
      const chapterFile = readFileSync(chapterListFilePath).toString()
      const $ = cheerio.load(chapterFile)

      const res = $('#chapterlist>p>a')
        .map(function(i, el) {
          if (this.attribs.href && this.attribs.href.startsWith('#')) {
            return 'skip'
          }

          const res = {
            url: `${wuxiaUrl}/${bookName}/${this.attribs.href}`,
          }

          const chapterText = $(this).text()
          if (chapterText.startsWith('Chapter')) {
            const [,chapterNumber, ...chapterName] = $(this).text().split(' ')
            res.number = parseInt(chapterNumber),
            res.chapter = chapterName.join(' ')
          } else {
            const [chapterNumber, ...chapterName] = $(this).text().split(' ')
            res.number = parseInt(chapterNumber),
            res.chapter = chapterName.join(' ')
          }

          return res
        }).get().filter(el => el !== 'skip')

      return res
    },
    async fetchChapters (chapterList) {
      for (const { url, number } of chapterList) {
        const { data } = await instance.get(url)
        writeFileSync(join(cacheDir, number + '.html'), data)
        console.log(`Chapter ${number} downloaded ...`)
        await sleep(1000)
      }
    },
    async parseChapters (chapterList) {
      chapterList.forEach(({ url, number }) => {
        const html = readFileSync(join(cacheDir, number + '.html')).toString()
        const $ = cheerio.load(html)
        const data = { text: $('#chaptercontent').text().trim() }

        writeFileSync(join(cacheDir, number + '.json'), JSON.stringify(data))
      })
    }
  }
}

