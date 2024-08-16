import { useState } from 'preact/hooks';
import "./app.css"

interface ABIInput {
  type: string;
  name: string;
  indexed?: boolean;
}

interface ABIEvent {
  type: string;
  name: string;
  inputs: ABIInput[];
}

export function App() {
  const [input, setInput] = useState<string>('');
  const [chain, setChain] = useState<string>('');
  const [explorer, setExplorer] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [events, setEvents] = useState<string[]>([]);
  const [tokens, setTokens] = useState<any[]>([]);
  const [apiKey, setApiKey] = useState<string>("");

  const parseABI = (abi: string): string[] => {
    try {
      const parsedABI: ABIEvent[] = JSON.parse(abi);
      return parsedABI
        .filter(item => item.type === 'event')
        .map(event => {
          const inputs = event.inputs.map(input => `${input.type} ${input.name}${input.indexed ? ' indexed' : ''}`).join(', ');
          return `${event.name}(${inputs})`;
        });
    } catch (error) {
      console.error('Error parsing ABI:', error);
      return ['Error parsing ABI. Please check your input.'];
    }
  };

  const handleInputChange = (e: Event): void => {
    const target = e.target as HTMLTextAreaElement;
    setInput(target.value);
    const parsedEvents = parseABI(target.value);
    setEvents(parsedEvents);
  };

  const getHeaders = (): any => {
    if (apiKey === "") {
      return {}
    } else {
      return { "Authorization": `Bearer ${apiKey}` }
    }
  }

  const handleGetAbi = async () => {
    const response = await fetch(`https://${explorer}/api/v2/smart-contracts/${address}`, getHeaders());
    console.log("fetched contract")
    const data = await response.json();
    const abi = JSON.stringify(data.abi);
    const parsedEvents = parseABI(abi);
    const tokens = await handleGetTokens();
    setInput(abi);
    setEvents(parsedEvents);
    setTokens(tokens);
  }

  const handleGetTokens = async () => {
    const response = await fetch(`https://${explorer}/api/v2/smart-contracts/${address}/methods-read`, getHeaders())
    console.log("fetched methods")
    const data = await response.json();
    const filteredQueries = data.filter((item: any) => ((item.name as string).toLowerCase().startsWith('token')));
    const tokens = filteredQueries.map((item: any) => ({ "name": item.name, "address": item.outputs[0].value }));
    const tokensPlus = await Promise.all(tokens.map(async (token: any) => {
      const tokenMetadata = await fetch(`https://${explorer}/api/v2/tokens/${token.address}`, getHeaders());
      const tokenData = await tokenMetadata.json();
      const final = { ...token, decimals: tokenData.decimals, symbol: tokenData.symbol, explorer_name: tokenData.name, holders: tokenData.holders, type: tokenData.type };
      return final;
    }));
    console.log("fetched tokens");
    return tokensPlus;
  }

  return (
    <>
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <h1>ABI Event Parser</h1>
        <input placeholder={"explorer domain"} style={{ fontFamily: "monospace" }}
          onInput={(e: Event): void => {
            setExplorer((e.target as HTMLInputElement).value);
          }}
        />
        <br />
        <input placeholder={"Contract address..."} style={{ fontFamily: "monospace" }}
          onInput={(e: Event): void => {
            setAddress((e.target as HTMLInputElement).value);
          }}
        />
        <button
          onClick={handleGetAbi}
        > Autofill </button>
        <br />
        <input placeholder={"Chain..."} style={{ fontFamily: "monospace" }}
          onInput={(e: Event): void => {
            setChain((e.target as HTMLInputElement).value);
          }}
        />
        <br />
        <input placeholder={"Api Key..."} style={{ fontFamily: "monospace" }}
          onInput={(e: Event): void => {
            setApiKey((e.target as HTMLInputElement).value);
          }}
        />
        <textarea
          value={input}
          onInput={handleInputChange}
          placeholder="Paste your ABI here..."
          style={{ width: '100%', height: '200px', marginBottom: '10px', fontFamily: 'monospace' }}
        />
        <br />
        {events.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <h2>Events</h2>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {events.join('\n')}
            </pre>
          </div>
        )}

        {tokens.length > 0 && (
          <>
            <h2>Pool Tokens</h2>
            {tokens.map((token) => {
              return (
                <div key={token.address}>
                  <p style={{ fontFamily: 'monospace' }}>{token.name}:{' '}
                    <a
                      href={`https://${explorer}/token/${token.address}`}
                      target="_blank"
                    >
                      {token.address}
                    </a>
                    {' '} - symbol: {token.symbol} - name: {token.explorer_name} - decimals: {token.decimals} - type: {token.type} - holders: {token.holders}
                  </p>
                </div>
              );
            })}
          </>
        )}
        {events.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <h2>Copy 🍝</h2>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {
                events.map((event) => {
                  return `${chain} | ${address} | event ${event}\n`
                })
              }
            </pre>
          </div>
        )}
      </div >
    </>
  );
}
