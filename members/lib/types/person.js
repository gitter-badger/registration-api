const prices = require('../../static/prices.json');
const util = require('../util');

class Person {
  static get fields() {
    return [
      // id SERIAL PRIMARY KEY
      'last_modified',  // timestamptz DEFAULT now()
      'legal_name',  // text NOT NULL
      'membership',  // MembershipStatus NOT NULL
      'member_number',  // damm_code
      'public_first_name', 'public_last_name',  // text
      'email',  // text
      'city', 'state', 'country',  // text
      'postcode', 'address',  // text
      'badge_text',  // text
      'can_hugo_nominate', 'can_hugo_vote', 'can_site_select',  // bool NOT NULL DEFAULT false
      'paper_pubs', //jsonb
      'contact_prefs' // jsonb
    ];
  }

  static get boolFields() {
    return [ 'can_hugo_nominate', 'can_hugo_vote', 'can_site_select' ];
  }

  static hugoVoterType(membership) {
    return [ 'Supporter', 'YoungAdult', 'FirstWorldcon', 'Adult' ].indexOf(membership) !== -1;
  }

  static get userModFields() {
    return [
      'legal_name',
      'public_first_name',
      'public_last_name',
      'city',
      'state',
      'country',
      'postcode',
      'address',
      'badge_text',
      'paper_pubs',
      'contact_prefs',
    ];
  }

  static get membershipTypes() {
    return Object.keys(prices.memberships);
    //return [ 'NonMember', 'Exhibitor', 'Supporter', 'Voter', 'Backer', 'BackerVoter', 'Friend', 'Infant', 'Child', 'YoungAdult', 'FirstWorldcon', 'Adult' ];
  }

  static get paperPubsFields() {
    return [ 'name', 'address', 'country' ];  // text
  }

  static get contactPrefsFields() {
    return ['email', 'snailmail']; // bool
  }

  static cleanMemberType(ms) {
    if (Person.membershipTypes.indexOf(ms) > -1) return ms;
      throw new Error('Invalid membership type: ' + JSON.stringify(ms) + 
                      ", must be one of ", Person.membershipType.join(','));
  }

  static cleanPaperPubs(pp) {
    if (!util.isTrueish(pp)) return null;
    if (typeof pp == 'string') pp = JSON.parse(pp);
    return Person.paperPubsFields.reduce((o, fn) => {
      if (!pp[fn]) throw new Error('If non-null, paper_pubs requires: ' + Person.paperPubsFields.join(', '));
      o[fn] = pp[fn];
      return o;
    }, {});
  }

  static cleanContactPrefs(cp) {
    if (! util.isTrueish(cp)) return null;
    if (typeof cp == 'string') cp = JSON.parse(cp);
    return Person.contactPrefsFields.reduce((o, fn) => {
      if (cp[fn] == undefined) throw new Error('If non-null, contact_prefs requires: ' + Person.contactPrefsFields.join(', '));
      o[fn] = cp[fn];
      return o;
    }, {});
  }

  constructor(src) {
    if (!src || !src.legal_name || !src.membership) throw new Error('Missing data for new Person (required: legal_name, membership)');
    this.data = Object.assign({}, src);
    Person.cleanMemberType(this.data.membership);
    Person.boolFields.forEach(fn => util.forceBool(this.data, fn));
    util.forceInt(this.data, 'member_number');
    if (this.data.membership === 'NonMember') this.data.member_number = null;
    this.data.paper_pubs = Person.cleanPaperPubs(this.data.paper_pubs);
    this.data.contact_prefs = Person.cleanContactPrefs(this.data.contact_prefs);
  }

  get hugoVoterType() {
    return Person.hugoVoterType(this.data.membership);
  }

  get passDays() {
    return Object.keys(this.data).filter(key => /^day\d+$/.test(key) && this.data[key]);
  }

  get preferredName() {
    const { legal_name, public_first_name, public_last_name } = this.data;
    return [public_first_name, public_last_name].filter(n => n).join(' ').trim() || legal_name;
  }

  get priceAsNewMember() {
    const ms = prices.memberships[this.data.membership];
    const pp = this.data.paper_pubs ? prices.PaperPubs.amount : 0;
    const da = this.data.discount ? this.data.discount.amount : 0;
    return (ms && ms.amount || 0) + pp - da;
  }

  get sqlValues() {
    const fields = Person.fields.filter(fn => this.data.hasOwnProperty(fn));
    const values = fields.map(fn => `$(${fn})`).join(', ');
    return `(${fields.join(', ')}) VALUES(${values})`;
  }
}

module.exports = Person;
