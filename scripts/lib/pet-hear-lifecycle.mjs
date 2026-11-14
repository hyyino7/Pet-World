// Apply one lifecycle repair to both pinned ordinary Pet chat carriers. The
// recorder/codec/provider stay upstream; closing invalidates pending work.
export function adaptPetHearLifecycle(source) {
  source=adaptPetRecorderFailure(source);
  const from=source.indexOf('function createHearControl(opts) {');
  const to=source.indexOf('\n//#endregion',from);
  if(from<0||to<from)throw Error('Pinned Pet hear control changed');
  let control=source.slice(from,to);
  const replace=(a,b)=>{if(control.split(a).length!==2)throw Error('Pinned Pet hear lifecycle changed: '+a);control=control.replace(a,()=>b);};
  replace('let hearState = "idle";','let hearState = "idle";\n\tlet disposed = false;\n\tlet generation = 0;\n\tlet controller;\n\tconst live = owner => !disposed && owner === generation && input.isConnected;');
  replace('const stop = async () => {','const stop = async () => {\n\t\tconst owner = generation, signal = controller?.signal;\n\t\tif (!live(owner)) return;');
  replace('const start = async () => {','const start = async () => {\n\t\tif (disposed || !input.isConnected) return;');
  replace('if (hearState !== "idle") return;','if (hearState !== "idle") return;\n\t\tconst owner = ++generation, abort = controller = new AbortController();');
  replace('recorder = await startRecording();','const next = await startRecording(abort.signal);\n\t\t\tif (!live(owner)) { next.cancel(); return; }\n\t\t\trecorder = next;');
  replace('} catch (e) {\n\t\t\thearState = "idle";','} catch (e) {\n\t\t\tif (!live(owner)) return;\n\t\t\thearState = "idle";');
  const clipLine=control.includes('const clip = await current$1.stop();')?'const clip = await current$1.stop();':'const clip = await current.stop();';
  replace(clipLine,clipLine+'\n\t\t\tif (!live(owner)) return;');
  control=control.replaceAll('if (!input.isConnected) return;','if (!live(owner)) return;');
  replace('const outcome = await hearAudio(hearUrl, toBase64(clip.wave));','const outcome = await hearAudio(hearUrl, toBase64(clip.wave), signal);');
  replace('hint.flash("录音出错：" + (e instanceof Error ? e.message : String(e)));','if (live(owner)) hint.flash("录音出错：" + (e instanceof Error ? e.message : String(e)));');
  replace('} finally {\n\t\t\thearState = "idle";\n\t\t\tpaint();','} finally {\n\t\t\tif (live(owner)) { hearState = "idle"; paint(); }');
  replace('dispose: () => {\n\t\t\twindow.clearInterval(hearTimer);','dispose: () => {\n\t\t\tdisposed = true;\n\t\t\tgeneration++;\n\t\t\tcontroller?.abort();\n\t\t\tcontroller = undefined;\n\t\t\twindow.clearInterval(hearTimer);');
  return source.slice(0,from)+control+source.slice(to);
}

// Match the compact recorder's lifecycle: make teardown available before audio
// graph construction, then dispose partial resources on any setup rejection.
// Keep the upstream codec, frame capture and stop/cancel behavior unchanged.
function adaptPetRecorderFailure(source) {
  const from=source.indexOf('async function startRecording() {');
  const to=source.indexOf('\n//#endregion',from);
  if(from<0||to<from)throw Error('Pinned Pet recorder changed');
  let recorder=source.slice(from,to);
  const replace=(a,b)=>{if(recorder.split(a).length!==2)throw Error('Pinned Pet recorder setup changed: '+a);recorder=recorder.replace(a,()=>b);};
  replace('async function startRecording() {','async function startRecording(signal) {\n\tsignal?.throwIfAborted();');
  const setup='\tconst ctx = new AudioContext({ sampleRate: HEAR_SAMPLE_RATE });\n\tconst source = ctx.createMediaStreamSource(stream);\n\tconst processor = ctx.createScriptProcessor(BLOCK_SAMPLES, 1, 1);';
  replace(setup,'\tlet ctx, source, processor;');
  replace(`\tconst teardown = () => {
\t\tif (closed) return;
\t\tclosed = true;
\t\tprocessor.onaudioprocess = null;
\t\ttry {
\t\t\tsource.disconnect();
\t\t\tprocessor.disconnect();
\t\t} catch {}
\t\tfor (const track of stream.getTracks()) track.stop();
\t\tctx.close();
\t};`,'');
  replace('\tprocessor.onaudioprocess = (event) => {',`\tconst teardown = () => {
\t\tif (closed) return;
\t\tclosed = true;
\t\tsignal?.removeEventListener('abort', teardown);
\t\tif (processor) processor.onaudioprocess = null;
\t\ttry { source?.disconnect(); } catch {}
\t\ttry { processor?.disconnect(); } catch {}
\t\tfor (const track of stream.getTracks()) { try { track.stop(); } catch {} }
\t\ttry { void Promise.resolve(ctx?.close()).catch(() => {}); } catch {}
\t};
\tsignal?.addEventListener('abort', teardown, {once:true});
\ttry {
\t\tsignal?.throwIfAborted();
\t\tctx = new AudioContext({ sampleRate: HEAR_SAMPLE_RATE });
\t\tsource = ctx.createMediaStreamSource(stream);
\t\tprocessor = ctx.createScriptProcessor(BLOCK_SAMPLES, 1, 1);
\tprocessor.onaudioprocess = (event) => {`);
  replace('\tawait ctx.resume();','\tawait ctx.resume();\n\t\tsignal?.throwIfAborted();\n\t} catch (error) {\n\t\tteardown();\n\t\tthrow error;\n\t}');
  return source.slice(0,from)+recorder+source.slice(to);
}
