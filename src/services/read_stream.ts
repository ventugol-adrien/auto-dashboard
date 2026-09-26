declare const process: {
  env: {
    LOCAL_URI?: string;
    DESKTOP_URI?: string;
  };
};

type FileLocation = "local" | "desktop";

export const getUri = (location: FileLocation, id: string) => {
  switch (location) {
    case "local":
      return `${process.env.LOCAL_URI}/${id}`;
    case "desktop":
      return `${process.env.DESKTOP_URI}/${id}`;
  }
};

export const readStream = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch data from ${url}: ${response.statusText}`);
  }
  if (!response.body) {
    throw new Error(`Response body is null for ${url}`);
  }
  const reader = response.body.getReader();
  let result = "";
  let done = false;
  while (!done) {
    const { value, done: readerDone } = await reader.read();
    done = readerDone;
    if (value) {
      result += new TextDecoder().decode(value);
    }
  }
  return result;
};

export default readStream;
