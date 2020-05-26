const noop = () => { }

const safeJoin = (array, seperator) => {
  return array.filter(s => s.trim()).join(seperator)
}

const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

module.exports.noop = noop
module.exports.safeJoin = safeJoin
module.exports.shuffle = shuffle