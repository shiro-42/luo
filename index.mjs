import createParser from './src/parsers/wuxiaWorld'

main()
  .then(() => {
    console.log('Exit success.')
    process.exit(0)
  }, (err) => {
    console.error('Got an error')
    console.log(err)
    process.exit(1)
  })

async function main () {
  const book = 'Gourmet-of-Another-World'

  const parser = createParser(book)
  // await parser.getIndex()
  // await parser.getChapterList()
  await parser.parseIndex()
  const chapterList = await parser.parseChapterList()
  // console.log(chapterList)
  // await parser.fetchChapters(chapterList)
  await parser.parseChapters(chapterList)
}

// Request the index page
// Parse the index page
// Get link for every chapters
// Request every chapters
// Parse chapters

