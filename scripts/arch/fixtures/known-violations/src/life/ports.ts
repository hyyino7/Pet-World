export function install(host) {
  host.native.lifeAdmission = () => true;
  const ports = host.native;
  ports.roomAdmission = undefined;
  const {native: boundary} = host;
  boundary.channelBoundary = undefined;
  ({value: ports.lifeAdmission} = {value: undefined});
}
