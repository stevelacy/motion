const assign = Object.assign
const keys = Object.keys

export default function createFilterer(data, options) {
    options || (options = {});
    var cache = {};

    return function(query) {
        var subquery;

        if (!cache[query]) {
            for (var i = query.length - 1; i > 0; i -= 1) {
                subquery = query.substr(0, i);

                if (cache[subquery]) {
                    cache[query] = find(cache[subquery], query, options);
                    break;
                }
            }
        }

        if (!cache[query]) {
            cache[query] = find(data, query, options);
        }

        return cache[query];
    };
};

function find(data, query, options) {
    return keys(data).reduce(function(acc, key) {
        var value = data[key];
        var matches;

        if (isPrimitive(value)) {
            if (contains(query, key, options) || contains(query, value, options)) {
                acc[key] = value;
            }
        } else {
            if (contains(query, key, options)) {
                acc[key] = value;
            } else {
                matches = find(value, query, options);

                if (!isEmpty(matches)) {
                    assign(acc, pair(key, matches));
                }
            }
        }

        return acc;
    }, {});
}

function contains(query, string, options) {
  if(options.ignoreCase) {
    query = String(query).toLowerCase();
    return string && String(string).toLowerCase().indexOf(query) !== -1;
  } else {
    return string && String(string).indexOf(query) !== -1;
  }
}

function isPrimitive(value) {
  var t = getType(value);
  return t !== 'Object' && t !== 'Array';
}

function pair(key, value) {
  var p = {};
  p[key] = value;
  return p;
}


