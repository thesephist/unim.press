const { Component } = window.Torus;
const html = window.jdom;

const HN_TOP_URL = "https://hacker-news.firebaseio.com/v0/topstories.json";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const SUBREDDITS = [
  "AskReddit",
  "pics",
  "news",
  "worldnews",
  "funny",
  "tifu",
  "videos",
  "gaming",
  "aww",
  "todayilearned",
  "gifs",
  "Art",
  "explainlikeimfive",
  "movies",
  "Jokes",
  "TwoXChromosomes",
  "mildlyinteresting",
  "LifeProTips",
  "askscience",
  "IAmA",
  "dataisbeautiful",
  "books",
  "science",
  "Showerthoughts",
  "gadgets",
  "Futurology",
  "nottheonion",
  "history",
  "sports",
  "OldSchoolCool",
  "GetMotivated",
  "DIY",
  "photoshopbattles",
  "nosleep",
  "Music",
  "space",
  "food",
  "UpliftingNews",
  "EarthPorn",
  "Documentaries",
  "InternetIsBeautiful",
  "WritingPrompts",
  "creepy",
  "philosophy",
  "announcements",
  "listentothis",
  "blog",
];

function R() {
  const MAX_PAGE = 30;
  return ~~(Math.random() * MAX_PAGE);
}

const debounce = (fn, delayMillis) => {
  let lastRun = 0;
  let to = null;
  return (...args) => {
    clearTimeout(to);
    const now = Date.now();
    const dfn = () => {
      lastRun = now;
      fn(...args);
    };
    if (now - lastRun > delayMillis) {
      dfn();
    } else {
      to = setTimeout(dfn, delayMillis);
    }
  };
};

function fmtCreated(created) {
  if (!created) {
    return "some time ago";
  }

  const date = new Date(created * 1000);
  const delta = (Date.now() - date) / 1000;
  if (delta < 60) {
    return "< 1 min ago";
  } else if (delta < 3600) {
    return `${~~(delta / 60)} min ago`;
  } else if (delta < 86400) {
    return `${~~(delta / 3600)} hrs ago`;
  } else if (delta < 86400 * 2) {
    return "yesterday";
  } else if (delta < 86400 * 3) {
    return "2 days ago";
  } else {
    return date.toLocaleDateString() + " " + formatTime(date);
  }
}

function formatDate() {
  const date = new Date();
  return `${DAYS[date.getDay()]}, ${
    MONTHS[date.getMonth()]
  } ${date.getDate()}, ${date.getFullYear()}`;
}

async function fetchRedditStories(subreddit) {
  const resp = await fetch(`https://api.reddit.com/r/${subreddit}/hot`)
    .then((r) => r.json())
    .catch((e) => console.log(error));
  const posts = resp.data.children;

  return posts
    .filter((post) => !post.data.pinned && !post.data.stickied)
    .map((post) => {
      console.log(post);
      let {
        title,
        author,
        created_utc,
        permalink,
        subreddit,
        thumbnail,
        selftext,
      } = post.data;
      if (["image", "default", "self", "nsfw"].includes(thumbnail)) {
        thumbnail = null;
      }

      return {
        title,
        author,
        created: created_utc,
        authorHref: `https://old.reddit.com/user/${author}`,
        href: `https://old.reddit.com${permalink}`,
        imageHref: thumbnail,
        source: "/r/" + subreddit,
        text: selftext,
      };
    });
}

async function fetchHNStories() {
  const storyIDs = await fetch(HN_TOP_URL)
    .then((r) => r.json())
    .catch((e) => console.log(error));

  const stories = await Promise.all(
    storyIDs.slice(0, 20).map((id) => {
      return fetch(
        `https://hacker-news.firebaseio.com/v0/item/${id}.json`
      ).then((r) => r.json());
    })
  );

  return stories.map((story) => {
    return {
      title: story.title,
      author: story.by,
      authorHref: `https://news.ycombinator.com/user?id=${story.by}`,
      href: story.url,
      imageHref: null,
      source: "Hacker News",
    };
  });
}

function LoremIpsum(created, text) {
  if (text) {
    const words = text.split(" ");
    if (words.length > 100) {
      return [
        html`<p>
          ${fmtCreated(created)}–${text.split(" ").slice(0, 100).join(" ")} ...
        </p>`,
        html`<p class="continued><em>Continued on Page A${R()}</em></p>`,
      ];
    } else {
      return html`<p>${fmtCreated(created)}–${text}</p>`;
    }
  }

  return html`<p>
    ${fmtCreated(created)}–Lorem ipsum dolor sit amet, ei mel cibo meliore
    instructior, eam te etiam clita. Id falli facilis intellegam his, eu populo
    dolorem offendit eam. Noster nemore luptatum ex sit. Ei sea melius
    definitiones.
  </p>`;
}

function Story(story) {
  if (!story) {
    return null;
  }

  const {
    title,
    author,
    created,
    authorHref,
    href,
    imageHref,
    source,
    text,
  } = story;
  return html`<div class="story">
    <a href="https://old.reddit.com${source}">
      <div class="story-source">${source}</div>
    </a>
    <a href="${href}" target="_blank>
      <h2 class="story-title">
        ${title}
      </h2>
    </a>
    <div class="story-byline">
      By
      <a href="${authorHref}" target="_blank" class="story-author">${author}</a>
    </div>
    <a href="${href}" target="_blank">
      ${imageHref ? html`<img class="story-image" src="${imageHref}" />` : null}
      <div class="story-content">${LoremIpsum(created, text)}</div>
    </a>
  </div>`;
}

class App extends Component {
  init() {
    this.stories = [];
    this.subreddit = window.location.hash.substr(1) || "all";

    this.resize = debounce(this.resize.bind(this), 500);
    window.addEventListener("resize", this.resize);

    this.fetch();
  }
  resize() {
    this.render();
  }
  async fetch() {
    if (this.subreddit == "hn") {
      this.stories = await fetchHNStories();
    } else {
      this.stories = await fetchRedditStories(this.subreddit);
    }

    this.render();
  }
  compose() {
    const stories = this.stories.slice();

    const centerSpreads = stories.slice(0, 2);
    const leftSidebar = stories.slice(2, 6);
    const sidebarSpread = stories.slice(6, 9);
    const bottom = stories.slice(9, 12);
    const mini = stories.slice(12, 16);
    const mini2 = stories.slice(16, 21);
    const mini3 = stories.slice(21, 25);

    const scale = Math.min((window.innerWidth / 1200) * 0.96, 1);

    return html`<div
      class="app flex-column"
      style="transform: scale(${scale}) translate(-50%, 0)"
    >
      <header class="flex-column">
        <div class="header-main flex-row">
          <div class="header-tagline header-main-aside">
            "All the Reddit <br />
            That's Fit to Uwu"
          </div>
          <a href="/" class="masthead-link">
            <h1 class="fraktur masthead">The Unim.Press</h1>
          </a>
          <div class="header-edition header-main-aside">
            <div class="header-edition-title">The Reddit Edition</div>
            <p class="header-edition-body justify">
              <strong>The Unim.press</strong> is a Reddit reader in the style of
              a certain well-known metropolitan newspaper. You're currently
              reading /r/${this.subreddit} on the Unim.press. The Unim.press is
              built by
              <strong
                ><a target="_blank" href="https://thesephist.com"
                  >@thesephist</a
                ></strong
              >
              and open-source on GitHub at
              <a target="_blank" href="https://github.com/thesephist/unim.press"
                >thesephist/unim.press</a
              >.
            </p>
          </div>
        </div>
        <div class="header-bar flex-row">
          <div class="header-vol bar-aside">VOL. CLXX . . . No. 3.14159</div>
          <div class="header-nyc">New York, ${formatDate()}</div>
          <div class="header-controls bar-aside">
            See other subreddits–<select
              oninput="${(evt) => {
                const selected = evt.target.value;
                window.location.hash = selected;
                this.subreddit = selected;
                this.fetch();
              }}"
            >
              <option value="all" selected>all</option>
              ${SUBREDDITS.map(
                (slug) => html`<option value="${slug}">${slug}</option>`
              )}
            </select>
          </div>
        </div>
      </header>
      <div class="main flex-row">
        <div class="left-sidebar flex-column smaller">
          ${leftSidebar.map(Story)}
        </div>
        <div class="spreads flex-column">
          <div class="top flex-row">
            <div class="center-spread">
              ${centerSpreads.map(Story)}
            </div>
            <div class="sidebar sidebar-spread flex-column smaller">
              ${sidebarSpread.map(Story)}
            </div>
          </div>
          <div class="bottom flex-row">${bottom.map(Story)}</div>
        </div>
      </div>
      <div class="mini flex-row smaller">${mini.map(Story)}</div>
      <div class="mini flex-row smaller">${mini2.map(Story)}</div>
      <div class="mini flex-row smaller">${mini3.map(Story)}</div>
      <footer>
        <p>
          The Unim.press is a project by
          <a target="_blank" href="https://thesephist.com">@thesephist</a>. It's
          built with
          <a target="_blank" href="https://github.com/thesephist/torus"
            >Torus</a
          >
          and open source on GitHub at
          <a target="_blank" href="https://github.com/thesephist/unim.press"
            >thesephist/unim.press</a
          >.
        </p>
      </footer>
    </div>`;
  }
  render(...args) {
    super.render(...args);

    this.node.querySelector("select").value = this.subreddit;
  }
}

const app = new App();
document.body.appendChild(app.node);
