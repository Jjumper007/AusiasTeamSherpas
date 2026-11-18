import type { Script } from '../script'

/** Sample script for Daniel: `nerd` level, retirement on his mind, `research_first` decision style. */
export const scriptFixture: Script = {
  scenes: [
    {
      part: 'hook',
      narration:
        'Dan, you told us retirement is what keeps you up at night. Here is the route for you, Emily, Oliver and Sophia.',
      visualIdea:
        'Dawn over a mountain range. Four hikers at the trailhead, the summit flagged in the distance.',
      factsUsed: [],
    },
    {
      part: 'where_you_are',
      narration:
        'Right now your family stands at 52 out of 100. Think of it as altitude: you are well above base camp, with real climbing still ahead. The summit, retirement in 2044, is 17 years up the trail.',
      visualIdea:
        'An altimeter rises to 52. The camera pans up the route to a summit flag labelled 2044.',
      factsUsed: ['SCORE_NOW', 'RETIREMENT_YEAR', 'YEARS_TO_RETIREMENT'],
    },
    {
      part: 'what_matters',
      narration:
        "Here are the numbers. Your retirement gap is $1.4M in today's dollars. Closing it takes about $34K more a year, and your free cash flow is $15K. Today, income covers 49% of what you will spend in retirement. So the climb is steep, but the plan still reaches age 91 with savings left.",
      visualIdea:
        'A trail map with a data table overlay: gap, extra saving per year, free cash flow, income share of need.',
      factsUsed: [
        'RETIREMENT_GAP',
        'RETIREMENT_EXTRA_SAVING_PER_YEAR',
        'FREE_CASH_FLOW_PER_YEAR',
        'RETIREMENT_INCOME_SHARE_OF_NEED',
        'PLAN_END_AGE',
      ],
    },
    {
      part: 'first_step',
      narration:
        'Before the long climb, check your pack. One piece of gear is missing: life cover. Your first step is to add it, so that the family keeps climbing even if one of you cannot.',
      visualIdea:
        'An open backpack with one empty slot. A rope labelled "life cover" drops into place.',
      factsUsed: [],
    },
    {
      part: 'what_changes',
      narration:
        'That single step lifts you from 52 to 57. Add umbrella cover and you reach 60. Same mountain, safer rope, and a clear next stretch toward the summit.',
      visualIdea:
        'The hikers move up one stretch of trail. The altimeter ticks from 52 to 57, then 60.',
      factsUsed: ['SCORE_NOW', 'SCORE_AFTER_LIFE_COVER', 'SCORE_AFTER_LIFE_AND_UMBRELLA'],
    },
  ],
  chapters: [
    {
      title: 'Your route',
      body: 'This plan is built around what you said matters most: retiring on time. It covers you, Emily, Oliver and Sophia.',
    },
    {
      title: 'Where you stand: 52',
      body: 'Your financial health score is 52 out of 100. Retirement is planned for 2044, 17 years from now.',
    },
    {
      title: 'The retirement numbers',
      body: "The gap is $1.4M in today's dollars and closing it takes about $34K more a year, against $15K of free cash flow. Income covers 49% of your retirement spending need. The plan still lasts to age 91.",
    },
    {
      title: 'Your first step',
      body: 'Add life cover. It is the highest-impact move in your plan and it protects everything else you build.',
    },
    {
      title: 'What changes',
      body: 'Life cover takes your score from 52 to 57. Together with umbrella cover it reaches 60.',
    },
  ],
  cta: {
    type: 'research_first',
    text: 'See why life cover comes first, and how the numbers were worked out.',
  },
}
