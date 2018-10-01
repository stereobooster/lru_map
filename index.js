const NEWER = Symbol("N");
const OLDER = Symbol("O");

/**
 * A doubly linked list-based Least Recently Used (LRU) cache. Will keep most
 * recently used items while discarding least recently used items when its limit
 * is reached.
 *
 * Licensed under MIT. Copyright (c) 2010 Rasmus Andersson <http://hunch.se/>
 * See README.md for details.
 *
 * Illustration of the design:
 *
 *       entry             entry             entry             entry
 *       ______            ______            ______            ______
 *      | head |.newer => |      |.newer => |      |.newer => | tail |
 *      |  A   |          |  B   |          |  C   |          |  D   |
 *      |______| <= older.|______| <= older.|______| <= older.|______|
 *
 *  removed  <--  <--  <--  <--  <--  <--  <--  <--  <--  <--  <--  added
 */
export default class LRUMap {
  constructor(limit /*, entries*/) {
    // if (typeof limit !== "number") {
    //   // called as (entries)
    //   entries = limit;
    //   limit = 0;
    // }

    this.size = 0;
    this.limit = limit;
    this.oldest = this.newest = undefined;
    this.map = new Map();

    // if (entries) {
    //   this.assign(entries);
    //   if (limit < 1) {
    //     this.limit = this.size;
    //   }
    // }
  }

  _bump(entry) {
    if (entry === this.newest) {
      // Already the most recenlty used entry, so no need to update the list
      return;
    }
    // HEAD--------------TAIL
    //   <.older   .newer>
    //  <--- add direction --
    //   A  B  C  <D>  E
    if (entry[NEWER]) {
      if (entry === this.oldest) {
        this.oldest = entry[NEWER];
      }
      entry[NEWER][OLDER] = entry[OLDER]; // C <-- E.
    }
    if (entry[OLDER]) {
      entry[OLDER][NEWER] = entry[NEWER]; // C. --> E
    }
    entry[NEWER] = undefined; // D --x
    entry[OLDER] = this.newest; // D. --> E
    if (this.newest) {
      this.newest[NEWER] = entry; // E. <-- D
    }
    this.newest = entry;
  }

  get(key) {
    // First, find our cache entry
    let entry = this.map.get(key);
    if (!entry) return; // Not cached. Sorry.
    // As <key> was found in the cache, register it as being requested recently
    this._bump(entry);
    return entry.value;
  }

  set(key, value) {
    let entry = this.map.get(key);

    if (entry) {
      // update existing
      entry.value = value;
      this._bump(entry);
      return this;
    }

    // new entry
    this.map.set(key, (entry = { key, value }));

    if (this.newest) {
      // link previous tail to the new tail (entry)
      this.newest[NEWER] = entry;
      entry[OLDER] = this.newest;
    } else {
      // we're first in -- yay
      this.oldest = entry;
    }

    // add new entry to the end of the linked list -- it's now the freshest entry.
    this.newest = entry;
    ++this.size;
    if (this.size > this.limit) {
      // we hit the limit -- remove the head
      this.shift();
    }

    return this;
  }

  shift() {
    // todo: handle special case when limit == 1
    let entry = this.oldest;
    if (entry) {
      if (this.oldest[NEWER]) {
        // advance the list
        this.oldest = this.oldest[NEWER];
        this.oldest[OLDER] = undefined;
      } else {
        // the cache is exhausted
        this.oldest = undefined;
        this.newest = undefined;
      }
      // Remove last strong reference to <entry> and remove links from the purged
      // entry being returned:
      entry[NEWER] = entry[OLDER] = undefined;
      this.map.delete(entry.key);
      --this.size;
      return [entry.key, entry.value];
    }
  }
}

// LRUMap.prototype.assign = function(entries) {
//   let entry,
//     limit = this.limit || Number.MAX_VALUE;
//   this.map.clear();
//   let it = entries[Symbol.iterator]();
//   for (let itv = it.next(); !itv.done; itv = it.next()) {
//     let e = { key: itv.value[0], value: itv.value[1] };
//     this.map.set(e.key, e);
//     if (!entry) {
//       this.oldest = e;
//     } else {
//       entry[NEWER] = e;
//       e[OLDER] = entry;
//     }
//     entry = e;
//     if (limit-- == 0) {
//       throw new Error("overflow");
//     }
//   }
//   this.newest = entry;
//   this.size = this.map.size;
// };

// ----------------------------------------------------------------------------
// Following code is optional and can be removed without breaking the core
// functionality.

// LRUMap.prototype.find = function(key) {
//   let e = this.map.get(key);
//   return e ? e.value : undefined;
// };

// LRUMap.prototype.has = function(key) {
//   return this.map.has(key);
// };

// LRUMap.prototype["delete"] = function(key) {
//   let entry = this.map.get(key);
//   if (!entry) return;
//   this.map.delete(entry.key);
//   if (entry[NEWER] && entry[OLDER]) {
//     // relink the older entry with the newer entry
//     entry[OLDER][NEWER] = entry[NEWER];
//     entry[NEWER][OLDER] = entry[OLDER];
//   } else if (entry[NEWER]) {
//     // remove the link to us
//     entry[NEWER][OLDER] = undefined;
//     // link the newer entry to head
//     this.oldest = entry[NEWER];
//   } else if (entry[OLDER]) {
//     // remove the link to us
//     entry[OLDER][NEWER] = undefined;
//     // link the newer entry to head
//     this.newest = entry[OLDER];
//   } else {
//     // if(entry[OLDER] === undefined && entry.newer === undefined) {
//     this.oldest = this.newest = undefined;
//   }

//   this.size--;
//   return entry.value;
// };

// LRUMap.prototype.clear = function() {
//   // Not clearing links should be safe, as we don't expose live links to user
//   this.oldest = this.newest = undefined;
//   this.size = 0;
//   this.map.clear();
// };

// function EntryIterator(oldestEntry) {
//   this.entry = oldestEntry;
// }
// EntryIterator.prototype[Symbol.iterator] = function() {
//   return this;
// };
// EntryIterator.prototype.next = function() {
//   let ent = this.entry;
//   if (ent) {
//     this.entry = ent[NEWER];
//     return { done: false, value: [ent.key, ent.value] };
//   } else {
//     return { done: true, value: undefined };
//   }
// };

// function KeyIterator(oldestEntry) {
//   this.entry = oldestEntry;
// }
// KeyIterator.prototype[Symbol.iterator] = function() {
//   return this;
// };
// KeyIterator.prototype.next = function() {
//   let ent = this.entry;
//   if (ent) {
//     this.entry = ent[NEWER];
//     return { done: false, value: ent.key };
//   } else {
//     return { done: true, value: undefined };
//   }
// };

// function ValueIterator(oldestEntry) {
//   this.entry = oldestEntry;
// }
// ValueIterator.prototype[Symbol.iterator] = function() {
//   return this;
// };
// ValueIterator.prototype.next = function() {
//   let ent = this.entry;
//   if (ent) {
//     this.entry = ent[NEWER];
//     return { done: false, value: ent.value };
//   } else {
//     return { done: true, value: undefined };
//   }
// };

// LRUMap.prototype.keys = function() {
//   return new KeyIterator(this.oldest);
// };

// LRUMap.prototype.values = function() {
//   return new ValueIterator(this.oldest);
// };

// LRUMap.prototype.entries = function() {
//   return this;
// };

// LRUMap.prototype[Symbol.iterator] = function() {
//   return new EntryIterator(this.oldest);
// };

// LRUMap.prototype.forEach = function(fun, thisObj) {
//   if (typeof thisObj !== "object") {
//     thisObj = this;
//   }
//   let entry = this.oldest;
//   while (entry) {
//     fun.call(thisObj, entry.value, entry.key, this);
//     entry = entry[NEWER];
//   }
// };

// /** Returns a JSON (array) representation */
// LRUMap.prototype.toJSON = function() {
//   let s = new Array(this.size),
//     i = 0,
//     entry = this.oldest;
//   while (entry) {
//     s[i++] = { key: entry.key, value: entry.value };
//     entry = entry[NEWER];
//   }
//   return s;
// };

// /** Returns a String representation */
// LRUMap.prototype.toString = function() {
//   let s = "",
//     entry = this.oldest;
//   while (entry) {
//     s += String(entry.key) + ":" + entry.value;
//     entry = entry[NEWER];
//     if (entry) {
//       s += " < ";
//     }
//   }
//   return s;
// };
