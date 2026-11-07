export interface DSAProblem {
  id: string;
  title: string;
  slug: string;
  category: string;
  difficulty: number; // 1: Easy, 2: Medium, 3: Hard, 4: Expert
  acceptance_rate: number;
  tags: string[];
  is_daily_challenge?: boolean;
  description: string;
  starter_templates: Record<string, string>;
  test_cases: Array<{ input: string; expected: string }>;
  hints: string[];
}

export const DSA_PROBLEMS_CATALOG: DSAProblem[] = [
  // ─── 1. ARRAYS & HASHING ───────────────────────────────────────────────────
  {
    id: 'prob-two-sum',
    title: 'Two Sum',
    slug: 'two-sum',
    category: 'Arrays & Hashing',
    difficulty: 1,
    acceptance_rate: 52.4,
    tags: ['Array', 'Hash Table', 'Blind 75', 'NeetCode 150'],
    is_daily_challenge: true,
    description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

**Example 1:**
\`\`\`
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].
\`\`\`

**Example 2:**
\`\`\`
Input: nums = [3,2,4], target = 6
Output: [1,2]
\`\`\``,
    starter_templates: {
      javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const diff = target - nums[i];
    if (map.has(diff)) {
      return [map.get(diff), i];
    }
    map.set(nums[i], i);
  }
  return [];
}

console.log(twoSum([2, 7, 11, 15], 9));`,
      python: `def twoSum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in seen:
            return [seen[diff], i]
        seen[num] = i
    return []`,
    },
    test_cases: [
      { input: 'twoSum([2,7,11,15], 9)', expected: '[0,1]' },
      { input: 'twoSum([3,2,4], 6)', expected: '[1,2]' },
      { input: 'twoSum([3,3], 6)', expected: '[0,1]' },
    ],
    hints: [
      'A brute force O(N^2) checks every pair. Can you store elements in a hash map as you iterate for O(N) lookup?',
      'Compute diff = target - current. If diff exists in your hash map, you have found the pair.',
    ],
  },
  {
    id: 'prob-valid-anagram',
    title: 'Valid Anagram',
    slug: 'valid-anagram',
    category: 'Arrays & Hashing',
    difficulty: 1,
    acceptance_rate: 64.1,
    tags: ['String', 'Hash Table', 'Blind 75'],
    description: `Given two strings \`s\` and \`t\`, return \`true\` if \`t\` is an anagram of \`s\`, and \`false\` otherwise.

An Anagram is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.

**Example 1:**
\`\`\`
Input: s = "anagram", t = "nagaram"
Output: true
\`\`\``,
    starter_templates: {
      javascript: `function isAnagram(s, t) {
  if (s.length !== t.length) return false;
  const count = {};
  for (const c of s) count[c] = (count[c] || 0) + 1;
  for (const c of t) {
    if (!count[c]) return false;
    count[c]--;
  }
  return true;
}

console.log(isAnagram("anagram", "nagaram"));`,
      python: `from collections import Counter
def isAnagram(s: str, t: str) -> bool:
    return Counter(s) == Counter(t)`,
    },
    test_cases: [
      { input: 'isAnagram("anagram", "nagaram")', expected: 'true' },
      { input: 'isAnagram("rat", "car")', expected: 'false' },
    ],
    hints: ['Count frequency of each character or sort both strings.'],
  },
  {
    id: 'prob-group-anagrams',
    title: 'Group Anagrams',
    slug: 'group-anagrams',
    category: 'Arrays & Hashing',
    difficulty: 2,
    acceptance_rate: 68.2,
    tags: ['Array', 'Hash Table', 'String', 'Blind 75'],
    description: `Given an array of strings \`strs\`, group the anagrams together. You can return the answer in any order.

**Example 1:**
\`\`\`
Input: strs = ["eat","tea","tan","ate","nat","bat"]
Output: [["bat"],["nat","tan"],["ate","eat","tea"]]
\`\`\``,
    starter_templates: {
      javascript: `function groupAnagrams(strs) {
  const map = new Map();
  for (const str of strs) {
    const key = str.split('').sort().join('');
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(str);
  }
  return Array.from(map.values());
}`,
    },
    test_cases: [
      { input: 'groupAnagrams(["eat","tea","tan","ate","nat","bat"]).length', expected: '3' },
    ],
    hints: ['Sort characters of each string to use as the hash key.'],
  },
  {
    id: 'prob-top-k-frequent-elements',
    title: 'Top K Frequent Elements',
    slug: 'top-k-frequent-elements',
    category: 'Arrays & Hashing',
    difficulty: 2,
    acceptance_rate: 63.8,
    tags: ['Array', 'Hash Table', 'Heap', 'Bucket Sort'],
    description: `Given an integer array \`nums\` and an integer \`k\`, return the \`k\` most frequent elements. You may return the answer in any order.

**Example 1:**
\`\`\`
Input: nums = [1,1,1,2,2,3], k = 2
Output: [1,2]
\`\`\``,
    starter_templates: {
      javascript: `function topKFrequent(nums, k) {
  const counts = new Map();
  for (const n of nums) counts.set(n, (counts.get(n) || 0) + 1);
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(entry => entry[0]);
}`,
    },
    test_cases: [
      { input: 'topKFrequent([1,1,1,2,2,3], 2)', expected: '[1,2]' },
    ],
    hints: ['Count frequencies with a hash map, then use Bucket Sort or Min Heap for O(N).'],
  },
  {
    id: 'prob-product-of-array-except-self',
    title: 'Product of Array Except Self',
    slug: 'product-of-array-except-self',
    category: 'Arrays & Hashing',
    difficulty: 2,
    acceptance_rate: 66.5,
    tags: ['Array', 'Prefix Sum', 'Blind 75'],
    description: `Given an integer array \`nums\`, return an array \`answer\` such that \`answer[i]\` is equal to the product of all the elements of \`nums\` except \`nums[i]\`.
You must write an algorithm that runs in **O(n)** time and without using the division operation.`,
    starter_templates: {
      javascript: `function productExceptSelf(nums) {
  const n = nums.length;
  const res = new Array(n).fill(1);
  let prefix = 1;
  for (let i = 0; i < n; i++) {
    res[i] = prefix;
    prefix *= nums[i];
  }
  let postfix = 1;
  for (let i = n - 1; i >= 0; i--) {
    res[i] *= postfix;
    postfix *= nums[i];
  }
  return res;
}`,
    },
    test_cases: [
      { input: 'productExceptSelf([1,2,3,4])', expected: '[24,12,8,6]' },
    ],
    hints: ['Calculate prefix products from left to right, then postfix products from right to left.'],
  },

  // ─── 2. TWO POINTERS ───────────────────────────────────────────────────────
  {
    id: 'prob-valid-palindrome',
    title: 'Valid Palindrome',
    slug: 'valid-palindrome',
    category: 'Two Pointers',
    difficulty: 1,
    acceptance_rate: 47.2,
    tags: ['Two Pointers', 'String', 'Blind 75'],
    description: `A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.

**Example 1:**
\`\`\`
Input: s = "A man, a plan, a canal: Panama"
Output: true
\`\`\``,
    starter_templates: {
      javascript: `function isPalindrome(s) {
  const clean = s.toLowerCase().replace(/[^a-z0-9]/g, '');
  let l = 0, r = clean.length - 1;
  while (l < r) {
    if (clean[l] !== clean[r]) return false;
    l++;
    r--;
  }
  return true;
}`,
    },
    test_cases: [
      { input: 'isPalindrome("A man, a plan, a canal: Panama")', expected: 'true' },
      { input: 'isPalindrome("race a car")', expected: 'false' },
    ],
    hints: ['Use left and right pointers moving inward toward the center.'],
  },
  {
    id: 'prob-3sum',
    title: '3Sum',
    slug: '3sum',
    category: 'Two Pointers',
    difficulty: 2,
    acceptance_rate: 34.6,
    tags: ['Two Pointers', 'Sorting', 'Blind 75'],
    description: `Given an integer array nums, return all the triplets \`[nums[i], nums[j], nums[k]]\` such that \`i != j\`, \`i != k\`, and \`j != k\`, and \`nums[i] + nums[j] + nums[k] == 0\`.
Notice that the solution set must not contain duplicate triplets.`,
    starter_templates: {
      javascript: `function threeSum(nums) {
  nums.sort((a, b) => a - b);
  const res = [];
  for (let i = 0; i < nums.length - 2; i++) {
    if (i > 0 && nums[i] === nums[i - 1]) continue;
    let l = i + 1, r = nums.length - 1;
    while (l < r) {
      const sum = nums[i] + nums[l] + nums[r];
      if (sum === 0) {
        res.push([nums[i], nums[l], nums[r]]);
        while (l < r && nums[l] === nums[l + 1]) l++;
        while (l < r && nums[r] === nums[r - 1]) r--;
        l++;
        r--;
      } else if (sum < 0) l++;
      else r--;
    }
  }
  return res;
}`,
    },
    test_cases: [
      { input: 'threeSum([-1,0,1,2,-1,-4]).length', expected: '2' },
    ],
    hints: ['Sort the array. For each element, run two-pointer two sum on the remaining elements.'],
  },
  {
    id: 'prob-container-with-most-water',
    title: 'Container With Most Water',
    slug: 'container-with-most-water',
    category: 'Two Pointers',
    difficulty: 2,
    acceptance_rate: 55.3,
    tags: ['Array', 'Two Pointers', 'Greedy', 'Blind 75'],
    description: `You are given an integer array \`height\` of length \`n\`. There are \`n\` vertical lines drawn such that the two endpoints of the \`i\`th line are \`(i, 0)\` and \`(i, height[i])\`.
Find two lines that together with the x-axis form a container, such that the container contains the most water. Return the maximum amount of water a container can store.`,
    starter_templates: {
      javascript: `function maxArea(height) {
  let max = 0, l = 0, r = height.length - 1;
  while (l < r) {
    const w = r - l;
    const h = Math.min(height[l], height[r]);
    max = Math.max(max, w * h);
    if (height[l] < height[r]) l++;
    else r--;
  }
  return max;
}`,
    },
    test_cases: [
      { input: 'maxArea([1,8,6,2,5,4,8,3,7])', expected: '49' },
    ],
    hints: ['Move the pointer pointing to the shorter vertical bar inward.'],
  },
  {
    id: 'prob-trapping-rain-water',
    title: 'Trapping Rain Water',
    slug: 'trapping-rain-water',
    category: 'Two Pointers',
    difficulty: 3,
    acceptance_rate: 61.4,
    tags: ['Array', 'Two Pointers', 'Dynamic Programming', 'Stack'],
    description: `Given \`n\` non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.`,
    starter_templates: {
      javascript: `function trap(height) {
  let l = 0, r = height.length - 1;
  let leftMax = 0, rightMax = 0, res = 0;
  while (l < r) {
    if (height[l] < height[r]) {
      if (height[l] >= leftMax) leftMax = height[l];
      else res += leftMax - height[l];
      l++;
    } else {
      if (height[r] >= rightMax) rightMax = height[r];
      else res += rightMax - height[r];
      r--;
    }
  }
  return res;
}`,
    },
    test_cases: [
      { input: 'trap([0,1,0,2,1,0,1,3,2,1,2,1])', expected: '6' },
    ],
    hints: ['Water trapped at any index is min(maxLeft, maxRight) - height[i].'],
  },

  // ─── 3. SLIDING WINDOW ─────────────────────────────────────────────────────
  {
    id: 'prob-best-time-to-buy-and-sell-stock',
    title: 'Best Time to Buy and Sell Stock',
    slug: 'best-time-to-buy-and-sell-stock',
    category: 'Sliding Window',
    difficulty: 1,
    acceptance_rate: 54.8,
    tags: ['Array', 'Dynamic Programming', 'Sliding Window', 'Blind 75'],
    description: `You are given an array \`prices\` where \`prices[i]\` is the price of a given stock on the \`i\`th day.
You want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock. Return the maximum profit you can achieve.`,
    starter_templates: {
      javascript: `function maxProfit(prices) {
  let minPrice = Infinity;
  let maxProfit = 0;
  for (const price of prices) {
    if (price < minPrice) minPrice = price;
    else if (price - minPrice > maxProfit) maxProfit = price - minPrice;
  }
  return maxProfit;
}`,
    },
    test_cases: [
      { input: 'maxProfit([7,1,5,3,6,4])', expected: '5' },
      { input: 'maxProfit([7,6,4,3,1])', expected: '0' },
    ],
    hints: ['Track the lowest buy price seen so far and maximize profit = currentPrice - minPrice.'],
  },
  {
    id: 'prob-longest-substring-without-repeating-characters',
    title: 'Longest Substring Without Repeating Characters',
    slug: 'longest-substring-without-repeating-characters',
    category: 'Sliding Window',
    difficulty: 2,
    acceptance_rate: 35.1,
    tags: ['Hash Table', 'String', 'Sliding Window', 'Blind 75'],
    description: `Given a string \`s\`, find the length of the longest substring without repeating characters.

**Example 1:**
\`\`\`
Input: s = "abcabcbb"
Output: 3 (Explanation: "abc", with length 3)
\`\`\``,
    starter_templates: {
      javascript: `function lengthOfLongestSubstring(s) {
  const set = new Set();
  let l = 0, max = 0;
  for (let r = 0; r < s.length; r++) {
    while (set.has(s[r])) {
      set.delete(s[l]);
      l++;
    }
    set.add(s[r]);
    max = Math.max(max, r - l + 1);
  }
  return max;
}`,
    },
    test_cases: [
      { input: 'lengthOfLongestSubstring("abcabcbb")', expected: '3' },
      { input: 'lengthOfLongestSubstring("bbbbb")', expected: '1' },
      { input: 'lengthOfLongestSubstring("pwwkew")', expected: '3' },
    ],
    hints: ['Expand right pointer until duplicate, then shrink left pointer.'],
  },

  // ─── 4. STACK ──────────────────────────────────────────────────────────────
  {
    id: 'prob-valid-parentheses',
    title: 'Valid Parentheses',
    slug: 'valid-parentheses',
    category: 'Stack',
    difficulty: 1,
    acceptance_rate: 41.0,
    tags: ['String', 'Stack', 'Blind 75'],
    description: `Given a string \`s\` containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.
Open brackets must be closed by the same type of brackets in the correct order.`,
    starter_templates: {
      javascript: `function isValid(s) {
  const stack = [];
  const map = { ')': '(', '}': '{', ']': '[' };
  for (const char of s) {
    if (char === '(' || char === '{' || char === '[') {
      stack.push(char);
    } else {
      if (stack.pop() !== map[char]) return false;
    }
  }
  return stack.length === 0;
}`,
    },
    test_cases: [
      { input: 'isValid("()[]{}")', expected: 'true' },
      { input: 'isValid("(]")', expected: 'false' },
    ],
    hints: ['Push opening brackets onto stack, pop and match on closing brackets.'],
  },
  {
    id: 'prob-min-stack',
    title: 'Min Stack',
    slug: 'min-stack',
    category: 'Stack',
    difficulty: 2,
    acceptance_rate: 54.0,
    tags: ['Stack', 'Design', 'Blind 75'],
    description: `Design a stack that supports push, pop, top, and retrieving the minimum element in constant O(1) time.`,
    starter_templates: {
      javascript: `class MinStack {
  constructor() {
    this.stack = [];
    this.minStack = [];
  }
  push(val) {
    this.stack.push(val);
    const min = this.minStack.length === 0 ? val : Math.min(val, this.minStack[this.minStack.length - 1]);
    this.minStack.push(min);
  }
  pop() {
    this.stack.pop();
    this.minStack.pop();
  }
  top() {
    return this.stack[this.stack.length - 1];
  }
  getMin() {
    return this.minStack[this.minStack.length - 1];
  }
}`,
    },
    test_cases: [
      { input: '(() => { const s = new MinStack(); s.push(-2); s.push(0); s.push(-3); return s.getMin(); })()', expected: '-3' },
    ],
    hints: ['Maintain a parallel stack containing the minimum value at each depth.'],
  },

  // ─── 5. BINARY SEARCH ──────────────────────────────────────────────────────
  {
    id: 'prob-binary-search',
    title: 'Binary Search',
    slug: 'binary-search',
    category: 'Binary Search',
    difficulty: 1,
    acceptance_rate: 57.2,
    tags: ['Array', 'Binary Search', 'Blind 75'],
    description: `Given an array of integers \`nums\` which is sorted in ascending order, and an integer \`target\`, write a function to search target in nums. If target exists, return its index. Otherwise, return -1. You must write an algorithm with **O(log n)** runtime complexity.`,
    starter_templates: {
      javascript: `function search(nums, target) {
  let l = 0, r = nums.length - 1;
  while (l <= r) {
    const mid = Math.floor((l + r) / 2);
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) l = mid + 1;
    else r = mid - 1;
  }
  return -1;
}`,
    },
    test_cases: [
      { input: 'search([-1,0,3,5,9,12], 9)', expected: '4' },
      { input: 'search([-1,0,3,5,9,12], 2)', expected: '-1' },
    ],
    hints: ['Calculate mid = l + Math.floor((r - l) / 2) to avoid integer overflow.'],
  },
  {
    id: 'prob-search-in-rotated-sorted-array',
    title: 'Search in Rotated Sorted Array',
    slug: 'search-in-rotated-sorted-array',
    category: 'Binary Search',
    difficulty: 2,
    acceptance_rate: 41.2,
    tags: ['Array', 'Binary Search', 'Blind 75'],
    description: `Given the array \`nums\` after possible rotation and an integer \`target\`, return the index of \`target\` if it is in nums, or -1 if it is not in nums. Algorithm must be O(log n).`,
    starter_templates: {
      javascript: `function searchRotated(nums, target) {
  let l = 0, r = nums.length - 1;
  while (l <= r) {
    const mid = Math.floor((l + r) / 2);
    if (nums[mid] === target) return mid;
    if (nums[l] <= nums[mid]) {
      if (target >= nums[l] && target < nums[mid]) r = mid - 1;
      else l = mid + 1;
    } else {
      if (target > nums[mid] && target <= nums[r]) l = mid + 1;
      else r = mid - 1;
    }
  }
  return -1;
}`,
    },
    test_cases: [
      { input: 'searchRotated([4,5,6,7,0,1,2], 0)', expected: '4' },
      { input: 'searchRotated([4,5,6,7,0,1,2], 3)', expected: '-1' },
    ],
    hints: ['One half of the rotated array is always strictly sorted.'],
  },

  // ─── 6. LINKED LIST ────────────────────────────────────────────────────────
  {
    id: 'prob-reverse-linked-list',
    title: 'Reverse Linked List',
    slug: 'reverse-linked-list',
    category: 'Linked List',
    difficulty: 1,
    acceptance_rate: 76.5,
    tags: ['Linked List', 'Recursion', 'Blind 75'],
    description: `Given the head of a singly linked list, reverse the list, and return the reversed list.`,
    starter_templates: {
      javascript: `function reverseList(head) {
  let prev = null, curr = head;
  while (curr) {
    const next = curr.next;
    curr.next = prev;
    prev = curr;
    curr = next;
  }
  return prev;
}`,
    },
    test_cases: [
      { input: 'typeof reverseList', expected: '"function"' },
    ],
    hints: ['Maintain prev, curr, and next pointers.'],
  },
  {
    id: 'prob-lru-cache',
    title: 'LRU Cache Implementation',
    slug: 'lru-cache',
    category: 'Design & Data Structures',
    difficulty: 3,
    acceptance_rate: 41.2,
    tags: ['Design', 'Hash Table', 'Linked List', 'Blind 75'],
    is_daily_challenge: false,
    description: `Design a data structure that follows the constraints of a Least Recently Used (LRU) cache.

Implement the LRUCache class:
- \`LRUCache(int capacity)\` Initialize the LRU cache with positive size capacity.
- \`int get(int key)\` Return the value of the key if the key exists, otherwise return -1.
- \`void put(int key, int value)\` Update the value of the key if the key exists. Otherwise, add the key-value pair to the cache. If the number of keys exceeds the capacity from this operation, evict the least recently used key.

The functions \`get\` and \`put\` must each run in **O(1)** average time complexity.`,
    starter_templates: {
      javascript: `class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map();
  }
  get(key) {
    if (!this.map.has(key)) return -1;
    const val = this.map.get(key);
    this.map.delete(key);
    this.map.set(key, val);
    return val;
  }
  put(key, value) {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.capacity) {
      const firstKey = this.map.keys().next().value;
      this.map.delete(firstKey);
    }
    this.map.set(key, value);
  }
}`,
    },
    test_cases: [
      { input: '(() => { const lru = new LRUCache(2); lru.put(1, 1); lru.put(2, 2); return lru.get(1); })()', expected: '1' },
    ],
    hints: ['Combine a Hash Map with a Doubly Linked List for O(1) reads and updates.'],
  },

  // ─── 7. TREES ──────────────────────────────────────────────────────────────
  {
    id: 'prob-invert-binary-tree',
    title: 'Invert Binary Tree',
    slug: 'invert-binary-tree',
    category: 'Trees',
    difficulty: 1,
    acceptance_rate: 77.0,
    tags: ['Tree', 'DFS', 'BFS', 'Binary Tree', 'Blind 75'],
    description: `Given the root of a binary tree, invert the tree, and return its root.`,
    starter_templates: {
      javascript: `function invertTree(root) {
  if (!root) return null;
  const temp = root.left;
  root.left = invertTree(root.right);
  root.right = invertTree(temp);
  return root;
}`,
    },
    test_cases: [
      { input: 'invertTree(null)', expected: 'null' },
    ],
    hints: ['Recursively invert the left and right subtrees and swap them.'],
  },
  {
    id: 'prob-maximum-depth-of-binary-tree',
    title: 'Maximum Depth of Binary Tree',
    slug: 'maximum-depth-of-binary-tree',
    category: 'Trees',
    difficulty: 1,
    acceptance_rate: 75.3,
    tags: ['Tree', 'DFS', 'Binary Tree', 'Blind 75'],
    description: `Given the root of a binary tree, return its maximum depth. Maximum depth is the number of nodes along the longest path from root to leaf node.`,
    starter_templates: {
      javascript: `function maxDepth(root) {
  if (!root) return 0;
  return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
}`,
    },
    test_cases: [
      { input: 'maxDepth(null)', expected: '0' },
    ],
    hints: ['Depth = 1 + max(depth(left), depth(right)).'],
  },

  // ─── 8. GRAPHS ─────────────────────────────────────────────────────────────
  {
    id: 'prob-number-of-islands',
    title: 'Number of Islands',
    slug: 'number-of-islands',
    category: 'Graphs',
    difficulty: 2,
    acceptance_rate: 59.1,
    tags: ['Array', 'DFS', 'BFS', 'Matrix', 'Blind 75'],
    description: `Given an \`m x n\` 2D binary grid \`grid\` which represents a map of '1's (land) and '0's (water), return the number of islands.
An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.`,
    starter_templates: {
      javascript: `function numIslands(grid) {
  if (!grid || grid.length === 0) return 0;
  let count = 0;
  const dfs = (r, c) => {
    if (r < 0 || c < 0 || r >= grid.length || c >= grid[0].length || grid[r][c] !== '1') return;
    grid[r][c] = '0';
    dfs(r + 1, c);
    dfs(r - 1, c);
    dfs(r, c + 1);
    dfs(r, c - 1);
  };
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      if (grid[r][c] === '1') {
        count++;
        dfs(r, c);
      }
    }
  }
  return count;
}`,
    },
    test_cases: [
      { input: 'numIslands([["1","1","0"],["1","1","0"],["0","0","1"]])', expected: '2' },
    ],
    hints: ['Sink visited land cells to 0 during DFS traversal.'],
  },
  {
    id: 'prob-course-schedule',
    title: 'Course Schedule Topological Sort',
    slug: 'course-schedule',
    category: 'Graphs',
    difficulty: 3,
    acceptance_rate: 46.8,
    tags: ['Graph', 'Topological Sort', 'DFS', 'Blind 75'],
    is_daily_challenge: false,
    description: `There are a total of \`numCourses\` courses you have to take, labeled from 0 to numCourses - 1. You are given an array prerequisites where \`prerequisites[i] = [a, b]\` indicates that you must take course b first if you want to take course a.
Return \`true\` if you can finish all courses. Otherwise, return \`false\` (cycle detected).`,
    starter_templates: {
      javascript: `function canFinish(numCourses, prerequisites) {
  const adj = Array.from({ length: numCourses }, () => []);
  const inDegree = new Array(numCourses).fill(0);
  for (const [c, pre] of prerequisites) {
    adj[pre].push(c);
    inDegree[c]++;
  }
  const queue = [];
  for (let i = 0; i < numCourses; i++) {
    if (inDegree[i] === 0) queue.push(i);
  }
  let count = 0;
  while (queue.length) {
    const node = queue.shift();
    count++;
    for (const next of adj[node]) {
      inDegree[next]--;
      if (inDegree[next] === 0) queue.push(next);
    }
  }
  return count === numCourses;
}`,
    },
    test_cases: [
      { input: 'canFinish(2, [[1,0]])', expected: 'true' },
      { input: 'canFinish(2, [[1,0],[0,1]])', expected: 'false' },
    ],
    hints: ['Use Kahns Algorithm (in-degree BFS) or DFS with a visiting state set.'],
  },

  // ─── 9. DYNAMIC PROGRAMMING ───────────────────────────────────────────────
  {
    id: 'prob-climbing-stairs',
    title: 'Climbing Stairs',
    slug: 'climbing-stairs',
    category: 'Dynamic Programming',
    difficulty: 1,
    acceptance_rate: 53.0,
    tags: ['Math', 'Dynamic Programming', 'Memoization', 'Blind 75'],
    description: `You are climbing a staircase. It takes \`n\` steps to reach the top.
Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?`,
    starter_templates: {
      javascript: `function climbStairs(n) {
  if (n <= 2) return n;
  let a = 1, b = 2;
  for (let i = 3; i <= n; i++) {
    const next = a + b;
    a = b;
    b = next;
  }
  return b;
}`,
    },
    test_cases: [
      { input: 'climbStairs(2)', expected: '2' },
      { input: 'climbStairs(3)', expected: '3' },
      { input: 'climbStairs(5)', expected: '8' },
    ],
    hints: ['Ways to reach step n is ways(n - 1) + ways(n - 2). It reduces to Fibonacci.'],
  },
  {
    id: 'prob-coin-change',
    title: 'Coin Change',
    slug: 'coin-change',
    category: 'Dynamic Programming',
    difficulty: 2,
    acceptance_rate: 43.5,
    tags: ['Array', 'Dynamic Programming', 'BFS', 'Blind 75'],
    description: `You are given an integer array \`coins\` representing coins of different denominations and an integer \`amount\` representing a total amount of money.
Return the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return -1.`,
    starter_templates: {
      javascript: `function coinChange(coins, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;
  for (let i = 1; i <= amount; i++) {
    for (const coin of coins) {
      if (i - coin >= 0) {
        dp[i] = Math.min(dp[i], 1 + dp[i - coin]);
      }
    }
  }
  return dp[amount] === Infinity ? -1 : dp[amount];
}`,
    },
    test_cases: [
      { input: 'coinChange([1,2,5], 11)', expected: '3' },
      { input: 'coinChange([2], 3)', expected: '-1' },
      { input: 'coinChange([1], 0)', expected: '0' },
    ],
    hints: ['Bottom-up DP: dp[i] = min(dp[i - c] + 1) for all c in coins.'],
  },
  {
    id: 'prob-longest-increasing-subsequence',
    title: 'Longest Increasing Subsequence',
    slug: 'longest-increasing-subsequence',
    category: 'Dynamic Programming',
    difficulty: 2,
    acceptance_rate: 54.6,
    tags: ['Array', 'Binary Search', 'Dynamic Programming', 'Blind 75'],
    description: `Given an integer array \`nums\`, return the length of the longest strictly increasing subsequence.`,
    starter_templates: {
      javascript: `function lengthOfLIS(nums) {
  const tails = [];
  for (const x of nums) {
    let i = 0, j = tails.length;
    while (i < j) {
      const m = Math.floor((i + j) / 2);
      if (tails[m] < x) i = m + 1;
      else j = m;
    }
    tails[i] = x;
  }
  return tails.length;
}`,
    },
    test_cases: [
      { input: 'lengthOfLIS([10,9,2,5,3,7,101,18])', expected: '4' },
      { input: 'lengthOfLIS([0,1,0,3,2,3])', expected: '4' },
    ],
    hints: ['Use binary search (patience sorting) for O(N log N) optimal complexity.'],
  },
  {
    id: 'prob-merge-intervals',
    title: 'Merge Intervals',
    slug: 'merge-intervals',
    category: 'Intervals',
    difficulty: 2,
    acceptance_rate: 47.1,
    tags: ['Array', 'Sorting', 'Blind 75'],
    description: `Given an array of \`intervals\` where \`intervals[i] = [starti, endi]\`, merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.`,
    starter_templates: {
      javascript: `function merge(intervals) {
  if (intervals.length <= 1) return intervals;
  intervals.sort((a, b) => a[0] - b[0]);
  const res = [intervals[0]];
  for (let i = 1; i < intervals.length; i++) {
    const last = res[res.length - 1];
    const curr = intervals[i];
    if (curr[0] <= last[1]) {
      last[1] = Math.max(last[1], curr[1]);
    } else {
      res.push(curr);
    }
  }
  return res;
}`,
    },
    test_cases: [
      { input: 'merge([[1,3],[2,6],[8,10],[15,18]]).length', expected: '3' },
    ],
    hints: ['Sort intervals by start time. Merge if current start <= previous end.'],
  },
];

