// Was a hardcoded constant while there was only ever one restaurant in the
// whole system. Now that Create Restaurant is real, that would mean this
// dashboard could only ever manage that one original restaurant no matter
// who logs in. Instead: RESTAURANT_ID is set once, dynamically, right after
// login, from the signed-in staff member's own restaurant_users row (see
// AuthContext). Every page in this app reads RESTAURANT_ID inside a
// component body/effect (never destructures it at module-load time), and ES
// module named imports are live bindings, so this update is picked up
// everywhere automatically -- no other file needed to change.
//
// Limitation this doesn't solve: one staff account tied to more than one
// restaurant. AuthContext just takes the first restaurant_users row it
// finds. A real "switch restaurant" picker is future work, same as the
// original single-tenant comment here already anticipated.
export let RESTAURANT_ID: string | null = null;

export function setRestaurantId(id: string | null) {
  RESTAURANT_ID = id;
}
