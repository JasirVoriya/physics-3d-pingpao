import pathlib
d=pathlib.Path(__file__).parent/'src'
s=(d/'shell.html').read_text()
js=''.join((d/f'app{i}.js').read_text() for i in (1,2,3))
s=s.replace('/*CSS*/',(d/'app.css').read_text()).replace('/*THREE*/',(d/'package/build/three.min.js').read_text()).replace('/*ORBIT*/',(d/'package/examples/js/controls/OrbitControls.js').read_text()).replace('/*APP*/',js)
out=pathlib.Path(__file__).parent/'index.html'; out.write_text(s); print(out, len(s))
