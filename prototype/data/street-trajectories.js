/* SPEC-SUIYIN-ADMIN-081: deterministic, local-only city schematic and synthetic records. */
'use strict';
window.AdminStreetTrajectoryData = (() => {
  // Approved local industry profiles; this fixture inventory is not a production whitelist.
  const profiles = Object.freeze(Object.fromEntries(['yestar-sz', 'yestar', 'yestar-bj', 'yestar-gz', 'yestar-hz', 'yestar-jx', 'huamei-xian', 'aoli-xian'].map(id => [id, Object.freeze({industry:'medical-aesthetics',streetTrajectories:true})])));
  const tenants = Object.freeze(Object.keys(profiles));
  const dayMs = 86400000;
  const names = ['陈晓楠', '林嘉怡', '张雨晴', '李思远', '周子涵', '何佳宁', '许文静', '王晨曦', '梁欣悦', '刘佳琪', '郑舒然', '杨可欣', '赵思齐', '宋安琪', '高明轩', '吴语桐', '谢梓萱', '黄诗语', '陈星宇', '孙一诺', '冯可心', '邓雨辰', '罗梦瑶', '杜晨阳'];
  // Routes turn only at this schematic's road intersections. These are not GPS coordinates.
  const routes = [
    [[140,130],[270,130],[420,130],[420,250],[600,250],[780,250],[780,380],[900,380]],
    [[270,490],[420,490],[600,490],[600,380],[780,380],[780,250],[900,250],[900,130]],
    [[140,250],[270,250],[270,380],[420,380],[420,490],[600,490],[780,490]],
    [[900,490],[780,490],[780,380],[600,380],[600,250],[420,250],[270,250],[270,130]],
    [[140,490],[140,380],[270,380],[420,380],[420,250],[420,130],[600,130]],
    [[900,130],[780,130],[600,130],[600,250],[780,250],[780,380],[600,380],[600,490]]
  ];
  function today() { return new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10); }
  function validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const stamp = Date.parse(value + 'T00:00:00Z');
    return Number.isFinite(stamp) && new Date(stamp).toISOString().slice(0, 10) === value;
  }
  function addDays(value, days) { return new Date(Date.parse(value + 'T00:00:00Z') + days * dayMs).toISOString().slice(0, 10); }
  function error(message, code) { const e = new Error(message); e.code = code; throw e; }
  function requireTenant(tenant) { if (profiles[tenant]?.industry !== 'medical-aesthetics' || profiles[tenant]?.streetTrajectories !== true) error('无权查看扫街轨迹', 'FORBIDDEN'); }
  function people(tenant) {
    requireTenant(tenant);
    const tenantIndex = tenants.indexOf(tenant);
    return Array.from({length: 24}, (_, index) => ({
      id: 'demo-' + String(index + 1).padStart(2, '0'), tenantId: tenant,
      name: names[(index === 1 ? tenantIndex * 3 : index + tenantIndex * 3) % names.length],
      department: index === 20 ? '' : ['外拓一组', '外拓二组', '商圈拓展组'][index % 3],
      role: 'street-promoter', synthetic: true
    }));
  }
  function pointTime(date, minute) {
    const h = Math.floor(minute / 60), m = minute % 60;
    return date + 'T' + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':00+08:00';
  }
  function makeSegments(tenant, personId, start, end) {
    const index = Number(personId.slice(5)) - 1, t = tenants.indexOf(tenant), last = today();
    const first = addDays(last, -364), from = start > first ? start : first, to = end < last ? end : last;
    const segments = [];
    if (from > to || index === 22) return segments;
    if (index === 23) {
      if (start <= last && end >= last) segments.push({id: tenant + ':' + personId + ':' + last + ':single', date: last, points: [{x:420,y:250,time:pointTime(last,630)}]});
      return segments;
    }
    for (let date = from; date <= to; date = addDays(date, 1)) {
      const dayIndex = Math.round((Date.parse(date + 'T00:00:00Z') - Date.parse(first + 'T00:00:00Z')) / dayMs);
      for (let part = 0; part < 2; part++) {
        const geometry = routes[(index + t + dayIndex + part * 2) % routes.length];
        const minutes = (part ? 14 * 60 + 10 : 9 * 60 + 5) + index % 5 * 6;
        segments.push({id: tenant + ':' + personId + ':' + date + ':' + part, date,
          points: geometry.map(([x,y], i) => ({x,y,time:pointTime(date,minutes + i * 9)}))});
      }
    }
    return segments;
  }
  // Broken input divides a segment. Never join valid points across a rejected record.
  function normalize(segments, start, end) {
    const result = []; let invalidCount = 0;
    const lower = Date.parse(start + 'T00:00:00+08:00'), upper = Date.parse(end + 'T00:00:00+08:00') + dayMs;
    for (const segment of segments) {
      let pending = [], fragment = 0;
      const flush = () => {
        if (pending.length) {
          pending.sort((a,b) => Date.parse(a.time) - Date.parse(b.time));
          result.push({id: segment.id + ':' + fragment++, date: pending[0].time.slice(0,10), points: pending});
        }
        pending = [];
      };
      for (const point of segment.points) {
        const timestamp = Date.parse(point.time), date = typeof point.time === 'string' ? point.time.slice(0,10) : '';
        if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 0 || point.x > 1000 || point.y < 0 || point.y > 600 || !Number.isFinite(timestamp) || !validDate(date)) { invalidCount++; flush(); continue; }
        if (timestamp < lower || timestamp >= upper) { flush(); continue; }
        if (pending.length && pending[0].time.slice(0,10) !== date) flush();
        pending.push({...point});
      }
      flush();
    }
    result.sort((a,b) => Date.parse(a.points[0].time) - Date.parse(b.points[0].time));
    return {segments: result, invalidCount, totalPoints: result.reduce((sum, s) => sum + s.points.length, 0)};
  }
  function query(tenant, personId, start, end, {scenario = ''} = {}) {
    requireTenant(tenant);
    const person = people(tenant).find(row => row.id === personId);
    if (!person || scenario === 'denied') error('无权查看扫街轨迹', 'FORBIDDEN');
    if (!validDate(start) || !validDate(end)) error('请选择完整日期范围', 'INVALID_DATE');
    if (start > end) error('开始日期不能晚于结束日期', 'INVALID_DATE');
    if (scenario === 'error') error('轨迹加载失败，请重试', 'LOAD_FAILED');
    let source = makeSegments(tenant, personId, start, end);
    if (scenario === 'empty') source = [];
    if (scenario === 'single') source = source.length ? [{...source[0], points:[source[0].points[0]]}] : [];
    if (scenario === 'invalid' && source.length) source[0].points.splice(3, 0, {x:NaN,y:250,time:'invalid'});
    if (scenario === 'all-invalid') source = [{id:'invalid',date:start,points:[{x:NaN,y:250,time:'invalid'}]}];
    if (scenario === 'dense') source = source.map(segment => ({...segment,points:segment.points.flatMap((point,index,points) => {
      const next = points[index+1]; if (!next) return [point];
      const count = 32;
      return Array.from({length:count}, (_,step) => ({x:point.x+(next.x-point.x)*step/count,y:point.y+(next.y-point.y)*step/count,
        time:new Date(Date.parse(point.time)+(Date.parse(next.time)-Date.parse(point.time))*step/count+8*3600000).toISOString().replace('Z','+08:00')}));
    })}));
    return {tenantId:tenant, person, start, end, synthetic:true, ...normalize(source,start,end)};
  }
  return Object.freeze({profiles,tenants,today,validDate,addDays,people,query,normalize});
})();
