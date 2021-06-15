Portions of the code found in the [module.js](module.js) file originate from [John Weston's SmallTime](https://github.com/unsoluble/smalltime) which is also [licensed under MIT](https://github.com/unsoluble/smalltime/blob/main/LICENSE):
 - [The asynchronous close() function inside the scsApp](https://github.com/arcanistzed/scs/blob/277783cbc04ab2ced66f231fc68c666d1ba6e42c/scripts/module.js#L32-L55)
 - [These default options](https://github.com/arcanistzed/scs/blob/4ef546e9bc7bd66a94d77534155db0989abfa1f6/scripts/module.js#L59-L86) which make the app appear in the correct location after loading
 - [This declaration](https://github.com/arcanistzed/scs/blob/277783cbc04ab2ced66f231fc68c666d1ba6e42c/scripts/module.js#L76) as well as the idea to implement the [Draggabilly](https://draggabilly.desandro.com) library (MIT license) which makes the app draggable
 - [These functions](https://github.com/arcanistzed/scs/blob/277783cbc04ab2ced66f231fc68c666d1ba6e42c/scripts/module.js#L121-L228) which control the experience of dragging the app around

The ["jiggle" animation](https://github.com/arcanistzed/scs/blob/277783cbc04ab2ced66f231fc68c666d1ba6e42c/styles/module.css#L81-L91) in the [module.css](module.css) file was also inspired by the one in the module above, but was heavily modified.

All other code is my own and is licensed as described in the [LICENSE](LICENSE) file.


The full [license text of SmallTime](https://github.com/unsoluble/smalltime/blob/main/LICENSE) is reproduced below for the sake of completness:
```
MIT License

Copyright (c) 2021 John Weston

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
