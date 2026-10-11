/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/kase_treasury.json`.
 */
export type KaseTreasury = {
  "address": "7P3NaKZkqSKHYjTUF638mZifpWMeVq1qvfPNNjtVFjWZ",
  "metadata": {
    "name": "kaseTreasury",
    "version": "0.1.0",
    "spec": "0.1.0"
  },
  "instructions": [
    {
      "name": "acceptIssuerAuthority",
      "discriminator": [
        68,
        51,
        39,
        79,
        55,
        177,
        220,
        214
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  115,
                  115,
                  117,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "config.id",
                "account": "issuerConfig"
              }
            ]
          }
        },
        {
          "name": "newAuthority",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "activateRedemption",
      "discriminator": [
        31,
        42,
        67,
        191,
        241,
        126,
        146,
        128
      ],
      "accounts": [
        {
          "name": "redemption",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  100,
                  101,
                  109,
                  112,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "bond"
              }
            ]
          }
        },
        {
          "name": "bond",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "bond.config",
                "account": "bond"
              },
              {
                "kind": "account",
                "path": "bond.id",
                "account": "bond"
              }
            ]
          },
          "relations": [
            "redemption",
            "snapshot",
            "registry"
          ]
        },
        {
          "name": "snapshot",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  110,
                  97,
                  112,
                  115,
                  104,
                  111,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "bond"
              },
              {
                "kind": "account",
                "path": "snapshot.snapshot_id",
                "account": "recordDateSnapshot"
              }
            ]
          }
        },
        {
          "name": "registry",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "bond"
              }
            ]
          }
        },
        {
          "name": "bondAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  110,
                  100,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "bond"
              }
            ]
          },
          "relations": [
            "bond"
          ]
        },
        {
          "name": "mint",
          "writable": true,
          "relations": [
            "bond"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "relations": [
            "bond"
          ]
        },
        {
          "name": "escrow",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "activator",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "castVote",
      "discriminator": [
        20,
        212,
        15,
        189,
        69,
        180,
        69,
        151
      ],
      "accounts": [
        {
          "name": "proposal",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  111,
                  118,
                  101,
                  114,
                  110,
                  97,
                  110,
                  99,
                  101,
                  95,
                  112,
                  114,
                  111,
                  112,
                  111,
                  115,
                  97,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "bond"
              },
              {
                "kind": "account",
                "path": "proposal.proposal_id",
                "account": "proposal"
              }
            ]
          }
        },
        {
          "name": "bond",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "bond.config",
                "account": "bond"
              },
              {
                "kind": "account",
                "path": "bond.id",
                "account": "bond"
              }
            ]
          },
          "relations": [
            "proposal",
            "snapshot"
          ]
        },
        {
          "name": "snapshot",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  110,
                  97,
                  112,
                  115,
                  104,
                  111,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "bond"
              },
              {
                "kind": "account",
                "path": "snapshot.snapshot_id",
                "account": "recordDateSnapshot"
              }
            ]
          },
          "relations": [
            "proposal"
          ]
        },
        {
          "name": "holder",
          "writable": true,
          "signer": true
        },
        {
          "name": "snapshotEntry",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  110,
                  97,
                  112,
                  115,
                  104,
                  111,
                  116,
                  95,
                  101,
                  110,
                  116,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "snapshot"
              },
              {
                "kind": "account",
                "path": "holder"
              }
            ]
          }
        },
        {
          "name": "receipt",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  111,
                  116,
                  101,
                  95,
                  114,
                  101,
                  99,
                  101,
                  105,
                  112,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "proposal"
              },
              {
                "kind": "account",
                "path": "holder"
              }
            ]
          }
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "choice",
          "type": {
            "defined": {
              "name": "voteChoice"
            }
          }
        }
      ]
    },
    {
      "name": "claimCoupon",
      "discriminator": [
        210,
        153,
        241,
        46,
        195,
        18,
        161,
        99
      ],
      "accounts": [
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  115,
                  115,
                  117,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "config.id",
                "account": "issuerConfig"
              }
            ]
          },
          "relations": [
            "bond",
            "settlementConfig"
          ]
        },
        {
          "name": "bond",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "bond.config",
                "account": "bond"
              },
              {
                "kind": "account",
                "path": "bond.id",
                "account": "bond"
              }
            ]
          },
          "relations": [
            "coupon",
            "snapshot"
          ]
        },
        {
          "name": "coupon",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  117,
                  112,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "bond"
              },
              {
                "kind": "account",
                "path": "coupon.period_id",
                "account": "couponPeriod"
              }
            ]
          }
        },
        {
          "name": "snapshot",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  110,
                  97,
                  112,
                  115,
                  104,
                  111,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "bond"
              },
              {
                "kind": "account",
                "path": "snapshot.snapshot_id",
                "account": "recordDateSnapshot"
              }
            ]
          }
        },
        {
          "name": "holder",
          "signer": true
        },
        {
          "name": "snapshotEntry",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  110,
                  97,
                  112,
                  115,
                  104,
                  111,
                  116,
                  95,
                  101,
                  110,
                  116,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "snapshot"
              },
              {
                "kind": "account",
                "path": "holder"
              }
            ]
          }
        },
        {
          "name": "settlementConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  116,
                  116,
                  108,
                  101,
                  109,
                  101,
                  110,
                  116,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "config"
              }
            ]
          }
        },
        {
          "name": "settlementMint"
        },
        {
          "name": "couponAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  117,
                  112,
                  111,
                  110,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "coupon"
              }
            ]
          }
        },
        {
          "name": "escrow",
          "writable": true
        },
        {
          "name": "destination",
          "writable": true
        },
        {
          "name": "claimRecord",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  117,
                  112,
                  111,
                  110,
                  95,
                  99,
                  108,
                  97,
                  105,
                  109
                ]
              },
              {
                "kind": "account",
                "path": "coupon"
              },
              {
                "kind": "account",
                "path": "holder"
              }
            ]
          }
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "claimRedemption",
      "discriminator": [
        109,
        110,
        9,
        188,
        195,
        217,
        112,
        83
      ],
      "accounts": [
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  115,
                  115,
                  117,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "config.id",
                "account": "issuerConfig"
              }
            ]
          },
          "relations": [
            "bond",
            "settlementConfig"
          ]
        },
        {
          "name": "bond",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "bond.config",
                "account": "bond"
              },
              {
                "kind": "account",
                "path": "bond.id",
                "account": "bond"
              }
            ]
          },
          "relations": [
            "redemption",
            "snapshot"
          ]
        },
        {
          "name": "redemption",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  100,
                  101,
                  109,
                  112,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "bond"
              }
            ]
          }
        },
        {
          "name": "snapshot",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  110,
                  97,
                  112,
                  115,
                  104,
                  111,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "bond"
              },
              {
                "kind": "account",
                "path": "snapshot.snapshot_id",
                "account": "recordDateSnapshot"
              }
            ]
          }
        },
        {
          "name": "holder",
          "writable": true,
          "signer": true
        },
        {
          "name": "snapshotEntry",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  110,
                  97,
                  112,
                  115,
                  104,
                  111,
                  116,
                  95,
                  101,
                  110,
                  116,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "snapshot"
              },
              {
                "kind": "account",
                "path": "holder"
              }
            ]
          }
        },
        {
          "name": "settlementConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  116,
                  116,
                  108,
                  101,
                  109,
                  101,
                  110,
                  116,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "config"
              }
            ]
          }
        },
        {
          "name": "settlementMint"
        },
        {
          "name": "redemptionAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  100,
                  101,
                  109,
                  112,
                  116,
                  105,
                  111,
                  110,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "redemption"
              }
            ]
          }
        },
        {
          "name": "escrow",
          "writable": true
        },
        {
          "name": "destination",
          "writable": true
        },
        {
          "name": "receipt",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  100,
                  101,
                  109,
                  112,
                  116,
                  105,
                  111,
                  110,
                  95,
                  99,
                  108,
                  97,
                  105,
                  109
                ]
              },
              {
                "kind": "account",
                "path": "redemption"
              },
              {
                "kind": "account",
                "path": "holder"
              }
            ]
          }
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "closeIssuance",
      "discriminator": [
        253,
        218,
        207,
        226,
        187,
        229,
        140,
        231
      ],
      "accounts": [
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  115,
                  115,
                  117,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "config.id",
                "account": "issuerConfig"
              }
            ]
          },
          "relations": [
            "bond"
          ]
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "bond",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "config"
              },
              {
                "kind": "account",
                "path": "bond.id",
                "account": "bond"
              }
            ]
          },
          "relations": [
            "registry"
          ]
        },
        {
          "name": "registry",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "bond"
              }
            ]
          }
        },
        {
          "name": "bondAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  110,
                  100,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "bond"
              }
            ]
          },
          "relations": [
            "bond"
          ]
        },
        {
          "name": "mint",
          "writable": true,
          "relations": [
            "bond"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "relations": [
            "bond"
          ]
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "configureSettlementMint",
      "discriminator": [
        224,
        238,
        92,
        71,
        247,
        244,
        65,
        14
      ],
      "accounts": [
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  115,
                  115,
                  117,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "config.id",
                "account": "issuerConfig"
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "settlementConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  116,
                  116,
                  108,
                  101,
                  109,
                  101,
                  110,
                  116,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "config"
              }
            ]
          }
        },
        {
          "name": "settlementMint"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "createBond",
      "discriminator": [
        96,
        81,
        70,
        166,
        111,
        33,
        61,
        50
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  115,
                  115,
                  117,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "config.id",
                "account": "issuerConfig"
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "bond",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "config"
              },
              {
                "kind": "arg",
                "path": "id"
              }
            ]
          }
        },
        {
          "name": "bondAuthority",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  110,
                  100,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "bond"
              }
            ]
          }
        },
        {
          "name": "mint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  110,
                  100,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "bond"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  110,
                  100,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "bond"
              }
            ]
          }
        },
        {
          "name": "registry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "bond"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "id",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "faceValueBase",
          "type": "u64"
        },
        {
          "name": "annualCouponBps",
          "type": "u16"
        },
        {
          "name": "frequency",
          "type": {
            "defined": {
              "name": "couponFrequency"
            }
          }
        },
        {
          "name": "maturityTs",
          "type": "i64"
        },
        {
          "name": "supplyCap",
          "type": "u64"
        }
      ]
    },
    {
      "name": "createCouponPeriod",
      "discriminator": [
        200,
        4,
        219,
        125,
        249,
        113,
        120,
        244
      ],
      "accounts": [
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  115,
                  115,
                  117,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "config.id",
                "account": "issuerConfig"
              }
            ]
          },
          "relations": [
            "bond",
            "settlementConfig"
          ]
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "bond",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "config"
              },
              {
                "kind": "account",
                "path": "bond.id",
                "account": "bond"
              }
            ]
          },
          "relations": [
            "snapshot"
          ]
        },
        {
          "name": "snapshot",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  110,
                  97,
                  112,
                  115,
                  104,
                  111,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "bond"
              },
              {
                "kind": "account",
                "path": "snapshot.snapshot_id",
                "account": "recordDateSnapshot"
              }
            ]
          }
        },
        {
          "name": "settlementConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  116,
                  116,
                  108,
                  101,
                  109,
                  101,
                  110,
                  116,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "config"
              }
            ]
          }
        },
        {
          "name": "settlementMint"
        },
        {
          "name": "coupon",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  117,
                  112,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "bond"
              },
              {
                "kind": "arg",
                "path": "periodId"
              }
            ]
          }
        },
        {
          "name": "couponAuthority",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  117,
                  112,
                  111,
                  110,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "coupon"
              }
            ]
          }
        },
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  117,
                  112,
                  111,
                  110,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "coupon"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "periodId",
          "type": "u64"
        },
        {
          "name": "recordDateTs",
          "type": "i64"
        },
        {
          "name": "paymentDateTs",
          "type": "i64"
        }
      ]
    },
    {
      "name": "createProposal",
      "discriminator": [
        132,
        116,
        68,
        174,
        216,
        160,
        198,
        22
      ],
      "accounts": [
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  115,
                  115,
                  117,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "config.id",
                "account": "issuerConfig"
              }
            ]
          },
          "relations": [
            "bond"
          ]
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "bond",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "config"
              },
              {
                "kind": "account",
                "path": "bond.id",
                "account": "bond"
              }
            ]
          },
          "relations": [
            "snapshot"
          ]
        },
        {
          "name": "snapshot",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  110,
                  97,
                  112,
                  115,
                  104,
                  111,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "bond"
              },
              {
                "kind": "account",
                "path": "snapshot.snapshot_id",
                "account": "recordDateSnapshot"
              }
            ]
          }
        },
        {
          "name": "proposal",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  111,
                  118,
                  101,
                  114,
                  110,
                  97,
                  110,
                  99,
                  101,
                  95,
                  112,
                  114,
                  111,
                  112,
                  111,
                  115,
                  97,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "bond"
              },
              {
                "kind": "arg",
                "path": "proposalId"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "proposalId",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "title",
          "type": "string"
        },
        {
          "name": "contentHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "votingStartTs",
          "type": "i64"
        },
        {
          "name": "votingEndTs",
          "type": "i64"
        },
        {
          "name": "quorumBps",
          "type": "u16"
        },
        {
          "name": "approvalBps",
          "type": "u16"
        }
      ]
    },
    {
      "name": "createRedemption",
      "discriminator": [
        142,
        217,
        144,
        66,
        200,
        61,
        157,
        30
      ],
      "accounts": [
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  115,
                  115,
                  117,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "config.id",
                "account": "issuerConfig"
              }
            ]
          },
          "relations": [
            "bond",
            "settlementConfig"
          ]
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "bond",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "config"
              },
              {
                "kind": "account",
                "path": "bond.id",
                "account": "bond"
              }
            ]
          },
          "relations": [
            "registry",
            "snapshot"
          ]
        },
        {
          "name": "registry",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "bond"
              }
            ]
          }
        },
        {
          "name": "snapshot",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  110,
                  97,
                  112,
                  115,
                  104,
                  111,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "bond"
              },
              {
                "kind": "account",
                "path": "snapshot.snapshot_id",
                "account": "recordDateSnapshot"
              }
            ]
          }
        },
        {
          "name": "settlementConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  116,
                  116,
                  108,
                  101,
                  109,
                  101,
                  110,
                  116,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "config"
              }
            ]
          }
        },
        {
          "name": "settlementMint"
        },
        {
          "name": "redemption",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  100,
                  101,
                  109,
                  112,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "bond"
              }
            ]
          }
        },
        {
          "name": "redemptionAuthority",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  100,
                  101,
                  109,
                  112,
                  116,
                  105,
                  111,
                  110,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "redemption"
              }
            ]
          }
        },
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  100,
                  101,
                  109,
                  112,
                  116,
                  105,
                  111,
                  110,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "redemption"
              }
            ]
          }
        },
        {
          "name": "bondAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  110,
                  100,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "bond"
              }
            ]
          },
          "relations": [
            "bond"
          ]
        },
        {
          "name": "mint",
          "relations": [
            "bond"
          ]
        },
        {
          "name": "vault",
          "relations": [
            "bond"
          ]
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "createSnapshot",
      "discriminator": [
        63,
        212,
        3,
        100,
        190,
        182,
        203,
        130
      ],
      "accounts": [
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  115,
                  115,
                  117,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "config.id",
                "account": "issuerConfig"
              }
            ]
          },
          "relations": [
            "bond"
          ]
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "bond",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "config"
              },
              {
                "kind": "account",
                "path": "bond.id",
                "account": "bond"
              }
            ]
          },
          "relations": [
            "registry"
          ]
        },
        {
          "name": "registry",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "bond"
              }
            ]
          }
        },
        {
          "name": "snapshot",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  110,
                  97,
                  112,
                  115,
                  104,
                  111,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "bond"
              },
              {
                "kind": "arg",
                "path": "snapshotId"
              }
            ]
          }
        },
        {
          "name": "bondAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  110,
                  100,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "bond"
              }
            ]
          },
          "relations": [
            "bond"
          ]
        },
        {
          "name": "mint",
          "relations": [
            "bond"
          ]
        },
        {
          "name": "vault",
          "relations": [
            "bond"
          ]
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "snapshotId",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "recordDateTs",
          "type": "i64"
        }
      ]
    },
    {
      "name": "finalizeProposal",
      "discriminator": [
        23,
        68,
        51,
        167,
        109,
        173,
        187,
        164
      ],
      "accounts": [
        {
          "name": "proposal",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  111,
                  118,
                  101,
                  114,
                  110,
                  97,
                  110,
                  99,
                  101,
                  95,
                  112,
                  114,
                  111,
                  112,
                  111,
                  115,
                  97,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "bond"
              },
              {
                "kind": "account",
                "path": "proposal.proposal_id",
                "account": "proposal"
              }
            ]
          }
        },
        {
          "name": "bond",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "bond.config",
                "account": "bond"
              },
              {
                "kind": "account",
                "path": "bond.id",
                "account": "bond"
              }
            ]
          },
          "relations": [
            "proposal",
            "snapshot"
          ]
        },
        {
          "name": "snapshot",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  110,
                  97,
                  112,
                  115,
                  104,
                  111,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "bond"
              },
              {
                "kind": "account",
                "path": "snapshot.snapshot_id",
                "account": "recordDateSnapshot"
              }
            ]
          },
          "relations": [
            "proposal"
          ]
        },
        {
          "name": "finalizer",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "finalizeSnapshot",
      "discriminator": [
        164,
        5,
        101,
        146,
        139,
        235,
        67,
        48
      ],
      "accounts": [
        {
          "name": "snapshot",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  110,
                  97,
                  112,
                  115,
                  104,
                  111,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "bond"
              },
              {
                "kind": "account",
                "path": "snapshot.snapshot_id",
                "account": "recordDateSnapshot"
              }
            ]
          }
        },
        {
          "name": "bond",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "bond.config",
                "account": "bond"
              },
              {
                "kind": "account",
                "path": "bond.id",
                "account": "bond"
              }
            ]
          },
          "relations": [
            "snapshot",
            "registry"
          ]
        },
        {
          "name": "registry",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "bond"
              }
            ]
          }
        },
        {
          "name": "bondAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  110,
                  100,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "bond"
              }
            ]
          },
          "relations": [
            "bond"
          ]
        },
        {
          "name": "mint",
          "relations": [
            "bond"
          ]
        },
        {
          "name": "vault",
          "relations": [
            "bond"
          ]
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "finalizer",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "fundCouponPeriod",
      "discriminator": [
        89,
        145,
        14,
        112,
        184,
        230,
        199,
        22
      ],
      "accounts": [
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  115,
                  115,
                  117,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "config.id",
                "account": "issuerConfig"
              }
            ]
          },
          "relations": [
            "bond",
            "settlementConfig"
          ]
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "bond",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "bond.config",
                "account": "bond"
              },
              {
                "kind": "account",
                "path": "bond.id",
                "account": "bond"
              }
            ]
          },
          "relations": [
            "coupon"
          ]
        },
        {
          "name": "coupon",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  117,
                  112,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "bond"
              },
              {
                "kind": "account",
                "path": "coupon.period_id",
                "account": "couponPeriod"
              }
            ]
          }
        },
        {
          "name": "settlementConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  116,
                  116,
                  108,
                  101,
                  109,
                  101,
                  110,
                  116,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "config"
              }
            ]
          }
        },
        {
          "name": "settlementMint"
        },
        {
          "name": "source",
          "writable": true
        },
        {
          "name": "escrow",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "fundRedemption",
      "discriminator": [
        63,
        242,
        144,
        13,
        107,
        199,
        16,
        159
      ],
      "accounts": [
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  115,
                  115,
                  117,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "config.id",
                "account": "issuerConfig"
              }
            ]
          },
          "relations": [
            "bond",
            "settlementConfig"
          ]
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "bond",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "bond.config",
                "account": "bond"
              },
              {
                "kind": "account",
                "path": "bond.id",
                "account": "bond"
              }
            ]
          },
          "relations": [
            "redemption"
          ]
        },
        {
          "name": "redemption",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  100,
                  101,
                  109,
                  112,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "bond"
              }
            ]
          }
        },
        {
          "name": "settlementConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  116,
                  116,
                  108,
                  101,
                  109,
                  101,
                  110,
                  116,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "config"
              }
            ]
          }
        },
        {
          "name": "settlementMint"
        },
        {
          "name": "source",
          "writable": true
        },
        {
          "name": "escrow",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initializeIssuer",
      "discriminator": [
        231,
        164,
        134,
        90,
        62,
        217,
        189,
        118
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  115,
                  115,
                  117,
                  101,
                  114
                ]
              },
              {
                "kind": "arg",
                "path": "id"
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "id",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "issueUnits",
      "discriminator": [
        39,
        120,
        190,
        191,
        225,
        131,
        155,
        248
      ],
      "accounts": [
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  115,
                  115,
                  117,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "config.id",
                "account": "issuerConfig"
              }
            ]
          },
          "relations": [
            "bond"
          ]
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "bond",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "config"
              },
              {
                "kind": "account",
                "path": "bond.id",
                "account": "bond"
              }
            ]
          },
          "relations": [
            "registry",
            "position"
          ]
        },
        {
          "name": "registry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "bond"
              }
            ]
          }
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "bond"
              },
              {
                "kind": "account",
                "path": "position.holder",
                "account": "position"
              }
            ]
          }
        },
        {
          "name": "bondAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  110,
                  100,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "bond"
              }
            ]
          },
          "relations": [
            "bond"
          ]
        },
        {
          "name": "mint",
          "writable": true,
          "relations": [
            "bond"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "relations": [
            "bond"
          ]
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "processSnapshotBatch",
      "discriminator": [
        205,
        141,
        245,
        230,
        22,
        7,
        191,
        172
      ],
      "accounts": [
        {
          "name": "snapshot",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  110,
                  97,
                  112,
                  115,
                  104,
                  111,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "bond"
              },
              {
                "kind": "account",
                "path": "snapshot.snapshot_id",
                "account": "recordDateSnapshot"
              }
            ]
          }
        },
        {
          "name": "bond",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "bond.config",
                "account": "bond"
              },
              {
                "kind": "account",
                "path": "bond.id",
                "account": "bond"
              }
            ]
          },
          "relations": [
            "snapshot",
            "registry"
          ]
        },
        {
          "name": "registry",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "bond"
              }
            ]
          }
        },
        {
          "name": "bondAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  110,
                  100,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "bond"
              }
            ]
          },
          "relations": [
            "bond"
          ]
        },
        {
          "name": "mint",
          "relations": [
            "bond"
          ]
        },
        {
          "name": "vault",
          "relations": [
            "bond"
          ]
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "cranker",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "startIndex",
          "type": "u8"
        },
        {
          "name": "batchSize",
          "type": "u8"
        }
      ]
    },
    {
      "name": "proposeIssuerAuthority",
      "discriminator": [
        39,
        132,
        136,
        42,
        232,
        76,
        223,
        142
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  115,
                  115,
                  117,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "config.id",
                "account": "issuerConfig"
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "config"
          ]
        }
      ],
      "args": [
        {
          "name": "newAuthority",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "registerHolder",
      "discriminator": [
        113,
        111,
        117,
        246,
        175,
        59,
        98,
        161
      ],
      "accounts": [
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  115,
                  115,
                  117,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "config.id",
                "account": "issuerConfig"
              }
            ]
          },
          "relations": [
            "bond"
          ]
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "bond",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "config"
              },
              {
                "kind": "account",
                "path": "bond.id",
                "account": "bond"
              }
            ]
          },
          "relations": [
            "registry"
          ]
        },
        {
          "name": "registry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "bond"
              }
            ]
          }
        },
        {
          "name": "registryEntry",
          "writable": true
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "bond"
              },
              {
                "kind": "account",
                "path": "holder"
              }
            ]
          }
        },
        {
          "name": "holder",
          "signer": true
        },
        {
          "name": "bondAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  110,
                  100,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "bond"
              }
            ]
          },
          "relations": [
            "bond"
          ]
        },
        {
          "name": "mint",
          "writable": true,
          "relations": [
            "bond"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "relations": [
            "bond"
          ]
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "bond",
      "discriminator": [
        224,
        128,
        48,
        251,
        182,
        246,
        111,
        196
      ]
    },
    {
      "name": "bondAuthority",
      "discriminator": [
        18,
        33,
        161,
        27,
        128,
        155,
        149,
        208
      ]
    },
    {
      "name": "claimRecord",
      "discriminator": [
        57,
        229,
        0,
        9,
        65,
        62,
        96,
        7
      ]
    },
    {
      "name": "couponAuthority",
      "discriminator": [
        146,
        251,
        213,
        165,
        191,
        37,
        234,
        244
      ]
    },
    {
      "name": "couponPeriod",
      "discriminator": [
        251,
        40,
        187,
        164,
        206,
        140,
        1,
        105
      ]
    },
    {
      "name": "issuerConfig",
      "discriminator": [
        238,
        244,
        71,
        221,
        254,
        169,
        247,
        237
      ]
    },
    {
      "name": "position",
      "discriminator": [
        170,
        188,
        143,
        228,
        122,
        64,
        247,
        208
      ]
    },
    {
      "name": "proposal",
      "discriminator": [
        26,
        94,
        189,
        187,
        116,
        136,
        53,
        33
      ]
    },
    {
      "name": "recordDateSnapshot",
      "discriminator": [
        159,
        46,
        49,
        211,
        237,
        40,
        253,
        255
      ]
    },
    {
      "name": "redemption",
      "discriminator": [
        112,
        75,
        232,
        189,
        22,
        114,
        156,
        203
      ]
    },
    {
      "name": "redemptionAuthority",
      "discriminator": [
        153,
        42,
        231,
        135,
        95,
        127,
        83,
        251
      ]
    },
    {
      "name": "redemptionReceipt",
      "discriminator": [
        220,
        43,
        221,
        166,
        174,
        69,
        111,
        26
      ]
    },
    {
      "name": "registryEntry",
      "discriminator": [
        48,
        198,
        240,
        252,
        155,
        186,
        72,
        16
      ]
    },
    {
      "name": "registryState",
      "discriminator": [
        29,
        34,
        224,
        195,
        175,
        183,
        99,
        97
      ]
    },
    {
      "name": "settlementConfig",
      "discriminator": [
        205,
        26,
        40,
        112,
        76,
        134,
        3,
        14
      ]
    },
    {
      "name": "snapshotEntry",
      "discriminator": [
        157,
        11,
        94,
        32,
        220,
        197,
        73,
        87
      ]
    },
    {
      "name": "voteReceipt",
      "discriminator": [
        104,
        20,
        204,
        252,
        45,
        84,
        37,
        195
      ]
    }
  ],
  "events": [
    {
      "name": "authorityAccepted",
      "discriminator": [
        166,
        192,
        219,
        188,
        41,
        209,
        195,
        26
      ]
    },
    {
      "name": "authorityProposed",
      "discriminator": [
        244,
        117,
        94,
        112,
        53,
        151,
        35,
        89
      ]
    },
    {
      "name": "bondCreated",
      "discriminator": [
        75,
        123,
        213,
        125,
        66,
        232,
        46,
        147
      ]
    },
    {
      "name": "couponClaimed",
      "discriminator": [
        37,
        168,
        115,
        183,
        112,
        176,
        208,
        244
      ]
    },
    {
      "name": "couponPeriodCreated",
      "discriminator": [
        245,
        230,
        169,
        99,
        192,
        193,
        51,
        8
      ]
    },
    {
      "name": "couponPeriodFunded",
      "discriminator": [
        207,
        6,
        234,
        162,
        135,
        253,
        224,
        210
      ]
    },
    {
      "name": "issuanceClosed",
      "discriminator": [
        201,
        37,
        48,
        106,
        168,
        8,
        118,
        96
      ]
    },
    {
      "name": "issuerInitialized",
      "discriminator": [
        130,
        46,
        97,
        66,
        58,
        159,
        113,
        106
      ]
    },
    {
      "name": "positionIssued",
      "discriminator": [
        209,
        157,
        125,
        103,
        51,
        213,
        80,
        72
      ]
    },
    {
      "name": "proposalCreated",
      "discriminator": [
        186,
        8,
        160,
        108,
        81,
        13,
        51,
        206
      ]
    },
    {
      "name": "proposalFinalized",
      "discriminator": [
        159,
        104,
        210,
        220,
        86,
        209,
        61,
        51
      ]
    },
    {
      "name": "redemptionActivated",
      "discriminator": [
        4,
        129,
        235,
        118,
        40,
        16,
        80,
        235
      ]
    },
    {
      "name": "redemptionClaimed",
      "discriminator": [
        107,
        251,
        199,
        213,
        59,
        173,
        53,
        189
      ]
    },
    {
      "name": "redemptionCreated",
      "discriminator": [
        19,
        18,
        62,
        60,
        141,
        70,
        169,
        111
      ]
    },
    {
      "name": "redemptionFunded",
      "discriminator": [
        146,
        26,
        237,
        133,
        155,
        44,
        150,
        215
      ]
    },
    {
      "name": "settlementMintConfigured",
      "discriminator": [
        133,
        76,
        186,
        39,
        127,
        253,
        100,
        188
      ]
    },
    {
      "name": "snapshotBatchProcessed",
      "discriminator": [
        50,
        156,
        234,
        210,
        25,
        190,
        159,
        185
      ]
    },
    {
      "name": "snapshotCreated",
      "discriminator": [
        252,
        52,
        172,
        62,
        191,
        103,
        75,
        76
      ]
    },
    {
      "name": "snapshotEntryRecorded",
      "discriminator": [
        64,
        246,
        210,
        105,
        2,
        242,
        62,
        157
      ]
    },
    {
      "name": "snapshotFinalized",
      "discriminator": [
        17,
        215,
        152,
        185,
        112,
        229,
        188,
        101
      ]
    },
    {
      "name": "voteCast",
      "discriminator": [
        39,
        53,
        195,
        104,
        188,
        17,
        225,
        213
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidId",
      "msg": "Identifier cannot be zero."
    },
    {
      "code": 6001,
      "name": "invalidAuthority",
      "msg": "Authority is invalid."
    },
    {
      "code": 6002,
      "name": "authorityUnchanged",
      "msg": "Authority is already current."
    },
    {
      "code": 6003,
      "name": "notPendingAuthority",
      "msg": "Only pending authority may accept the transfer."
    },
    {
      "code": 6004,
      "name": "invalidTerms",
      "msg": "Bond terms are outside supported bounds."
    },
    {
      "code": 6005,
      "name": "invalidMaturity",
      "msg": "Maturity must be in the future."
    },
    {
      "code": 6006,
      "name": "invalidSupplyCap",
      "msg": "Supply cap must be positive."
    },
    {
      "code": 6007,
      "name": "zeroAmount",
      "msg": "Amount must be positive."
    },
    {
      "code": 6008,
      "name": "issuanceClosed",
      "msg": "Issuance is closed."
    },
    {
      "code": 6009,
      "name": "bondMatured",
      "msg": "Bond has matured."
    },
    {
      "code": 6010,
      "name": "registryFull",
      "msg": "Registry capacity reached."
    },
    {
      "code": 6011,
      "name": "duplicateHolder",
      "msg": "Holder is already registered."
    },
    {
      "code": 6012,
      "name": "unregisteredHolder",
      "msg": "Holder is not registered."
    },
    {
      "code": 6013,
      "name": "supplyCap",
      "msg": "Supply cap would be exceeded."
    },
    {
      "code": 6014,
      "name": "overflow",
      "msg": "Arithmetic overflow."
    },
    {
      "code": 6015,
      "name": "invalidMint",
      "msg": "Bond mint is not a valid classic SPL mint with expected authority/decimals."
    },
    {
      "code": 6016,
      "name": "invalidVault",
      "msg": "Bond vault is not a valid classic SPL token account with expected mint/authority."
    },
    {
      "code": 6017,
      "name": "supplyMismatch",
      "msg": "Token mint supply mismatch."
    },
    {
      "code": 6018,
      "name": "vaultMismatch",
      "msg": "Custody vault balance mismatch."
    },
    {
      "code": 6019,
      "name": "wrongAuthority",
      "msg": "Bond authority PDA mismatch."
    },
    {
      "code": 6020,
      "name": "wrongPositionOwner",
      "msg": "Position account has wrong owner."
    },
    {
      "code": 6021,
      "name": "wrongPositionPda",
      "msg": "Position PDA is invalid."
    },
    {
      "code": 6022,
      "name": "positionCountMismatch",
      "msg": "Position count does not match registry."
    },
    {
      "code": 6023,
      "name": "positionTotalMismatch",
      "msg": "Position sum does not match recorded supply."
    },
    {
      "code": 6024,
      "name": "emptyIssuance",
      "msg": "Cannot close an empty issuance."
    },
    {
      "code": 6025,
      "name": "invalidSnapshotId",
      "msg": "Snapshot identifier cannot be zero."
    },
    {
      "code": 6026,
      "name": "issuanceNotClosed",
      "msg": "A snapshot requires a closed, immutable issuance."
    },
    {
      "code": 6027,
      "name": "retroactiveSnapshot",
      "msg": "Record date cannot be in the past when snapshot is created."
    },
    {
      "code": 6028,
      "name": "emptySnapshot",
      "msg": "Snapshot requires at least one registered holder and one bond unit."
    },
    {
      "code": 6029,
      "name": "snapshotNotDue",
      "msg": "Snapshot record date has not arrived."
    },
    {
      "code": 6030,
      "name": "snapshotFinalized",
      "msg": "Snapshot has already been finalized."
    },
    {
      "code": 6031,
      "name": "invalidSnapshotBatch",
      "msg": "Snapshot batch size is zero, too large, or has an incorrect account list."
    },
    {
      "code": 6032,
      "name": "snapshotIndexMismatch",
      "msg": "Snapshot batch start index is not the next required registry index."
    },
    {
      "code": 6033,
      "name": "invalidRegistryEntry",
      "msg": "Registry entry account is invalid for this bond and index."
    },
    {
      "code": 6034,
      "name": "invalidPosition",
      "msg": "Position account is invalid for the registry holder."
    },
    {
      "code": 6035,
      "name": "invalidSnapshotEntry",
      "msg": "Snapshot entry PDA or account is invalid."
    },
    {
      "code": 6036,
      "name": "duplicateSnapshotEntry",
      "msg": "A snapshot entry already exists for this holder."
    },
    {
      "code": 6037,
      "name": "snapshotCountMismatch",
      "msg": "Snapshot holder count does not match the registry."
    },
    {
      "code": 6038,
      "name": "snapshotTotalMismatch",
      "msg": "Snapshot total does not match the frozen registry supply."
    },
    {
      "code": 6039,
      "name": "snapshotIncomplete",
      "msg": "Snapshot cannot be finalized before every holder has been processed."
    },
    {
      "code": 6040,
      "name": "invalidTransition",
      "msg": "Lifecycle transition is invalid or repeated."
    },
    {
      "code": 6041,
      "name": "snapshotNotFinalized",
      "msg": "Snapshot must be finalized."
    },
    {
      "code": 6042,
      "name": "wrongSnapshot",
      "msg": "Coupon references a different snapshot."
    },
    {
      "code": 6043,
      "name": "invalidPaymentDate",
      "msg": "Payment date must be on or after record date and current chain time."
    },
    {
      "code": 6044,
      "name": "invalidSettlementMint",
      "msg": "Settlement mint must be classic SPL with six decimals."
    },
    {
      "code": 6045,
      "name": "zeroCoupon",
      "msg": "Coupon rounds to zero settlement base units."
    },
    {
      "code": 6046,
      "name": "fundingAmountMismatch",
      "msg": "Funding must exactly equal the coupon reserve."
    },
    {
      "code": 6047,
      "name": "couponNotFunded",
      "msg": "Coupon is not fully funded."
    },
    {
      "code": 6048,
      "name": "paymentNotDue",
      "msg": "Coupon payment date has not arrived."
    },
    {
      "code": 6049,
      "name": "wrongBond",
      "msg": "Bond account does not match coupon."
    },
    {
      "code": 6050,
      "name": "ineligibleHolder",
      "msg": "Snapshot entry does not establish holder eligibility."
    },
    {
      "code": 6051,
      "name": "invalidSettlementAccount",
      "msg": "Settlement source token account is invalid."
    },
    {
      "code": 6052,
      "name": "invalidDestination",
      "msg": "Destination must be a token account owned by the holder."
    },
    {
      "code": 6053,
      "name": "insufficientReserve",
      "msg": "Coupon or principal reserve is insufficient."
    },
    {
      "code": 6054,
      "name": "bondNotMatured",
      "msg": "Bond maturity has not arrived."
    },
    {
      "code": 6055,
      "name": "redemptionNotFunded",
      "msg": "Bond principal redemption is not fully funded."
    },
    {
      "code": 6056,
      "name": "redemptionNotActive",
      "msg": "Redemption has not been activated."
    },
    {
      "code": 6057,
      "name": "invalidProposalId",
      "msg": "Proposal identifier cannot be zero."
    },
    {
      "code": 6058,
      "name": "invalidProposalContent",
      "msg": "Proposal content hash cannot be zero."
    },
    {
      "code": 6059,
      "name": "invalidProposalTitle",
      "msg": "Proposal title is empty or exceeds its byte limit."
    },
    {
      "code": 6060,
      "name": "invalidVotingWindow",
      "msg": "Voting window is invalid, retroactive, or longer than the supported maximum."
    },
    {
      "code": 6061,
      "name": "invalidGovernanceThreshold",
      "msg": "Quorum or approval threshold is outside 0-10000 basis points."
    },
    {
      "code": 6062,
      "name": "bondRedeemed",
      "msg": "Bond has entered terminal redemption state."
    },
    {
      "code": 6063,
      "name": "proposalNotOpen",
      "msg": "Proposal is not open."
    },
    {
      "code": 6064,
      "name": "votingNotStarted",
      "msg": "Voting has not started."
    },
    {
      "code": 6065,
      "name": "votingEnded",
      "msg": "Voting window has ended."
    },
    {
      "code": 6066,
      "name": "votingNotEnded",
      "msg": "Voting window has not ended."
    },
    {
      "code": 6067,
      "name": "ineligibleVoter",
      "msg": "Voter is not eligible in the proposal snapshot."
    },
    {
      "code": 6068,
      "name": "governanceAccountingMismatch",
      "msg": "Governance vote totals do not reconcile with snapshot power."
    }
  ],
  "types": [
    {
      "name": "authorityAccepted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "config",
            "type": "pubkey"
          },
          {
            "name": "old",
            "type": "pubkey"
          },
          {
            "name": "new",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "authorityProposed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "config",
            "type": "pubkey"
          },
          {
            "name": "proposed",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "bond",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "config",
            "type": "pubkey"
          },
          {
            "name": "id",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "bondAuthority",
            "type": "pubkey"
          },
          {
            "name": "faceValueBase",
            "type": "u64"
          },
          {
            "name": "annualCouponBps",
            "type": "u16"
          },
          {
            "name": "frequency",
            "type": {
              "defined": {
                "name": "couponFrequency"
              }
            }
          },
          {
            "name": "maturityTs",
            "type": "i64"
          },
          {
            "name": "supplyCap",
            "type": "u64"
          },
          {
            "name": "issued",
            "type": "u64"
          },
          {
            "name": "outstanding",
            "type": "u64"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "status"
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "authorityBump",
            "type": "u8"
          },
          {
            "name": "registryBump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "bondAuthority",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bond",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "bondCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bond",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "supplyCap",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "claimRecord",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "coupon",
            "type": "pubkey"
          },
          {
            "name": "holder",
            "type": "pubkey"
          },
          {
            "name": "amountBase",
            "type": "u64"
          },
          {
            "name": "paidAtTs",
            "type": "i64"
          },
          {
            "name": "paidSlot",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "couponAuthority",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "coupon",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "couponClaimed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "coupon",
            "type": "pubkey"
          },
          {
            "name": "holder",
            "type": "pubkey"
          },
          {
            "name": "amountBase",
            "type": "u64"
          },
          {
            "name": "paidTotalBase",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "couponFrequency",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "semiannual"
          }
        ]
      }
    },
    {
      "name": "couponPeriod",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bond",
            "type": "pubkey"
          },
          {
            "name": "snapshot",
            "type": "pubkey"
          },
          {
            "name": "settlementMint",
            "type": "pubkey"
          },
          {
            "name": "escrow",
            "type": "pubkey"
          },
          {
            "name": "couponAuthority",
            "type": "pubkey"
          },
          {
            "name": "issuer",
            "type": "pubkey"
          },
          {
            "name": "periodId",
            "type": "u64"
          },
          {
            "name": "recordDateTs",
            "type": "i64"
          },
          {
            "name": "paymentDateTs",
            "type": "i64"
          },
          {
            "name": "couponPerBondBase",
            "type": "u64"
          },
          {
            "name": "expectedTotalBase",
            "type": "u64"
          },
          {
            "name": "fundedTotalBase",
            "type": "u64"
          },
          {
            "name": "paidTotalBase",
            "type": "u64"
          },
          {
            "name": "claimCount",
            "type": "u8"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "couponStatus"
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "couponPeriodCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "coupon",
            "type": "pubkey"
          },
          {
            "name": "bond",
            "type": "pubkey"
          },
          {
            "name": "snapshot",
            "type": "pubkey"
          },
          {
            "name": "periodId",
            "type": "u64"
          },
          {
            "name": "couponPerBondBase",
            "type": "u64"
          },
          {
            "name": "expectedTotalBase",
            "type": "u64"
          },
          {
            "name": "paymentDateTs",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "couponPeriodFunded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "coupon",
            "type": "pubkey"
          },
          {
            "name": "fundedTotalBase",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "couponStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "created"
          },
          {
            "name": "funded"
          },
          {
            "name": "complete"
          }
        ]
      }
    },
    {
      "name": "issuanceClosed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bond",
            "type": "pubkey"
          },
          {
            "name": "units",
            "type": "u64"
          },
          {
            "name": "holders",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "issuerConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "pending",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "issuerInitialized",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "config",
            "type": "pubkey"
          },
          {
            "name": "authority",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "position",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bond",
            "type": "pubkey"
          },
          {
            "name": "holder",
            "type": "pubkey"
          },
          {
            "name": "units",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "positionIssued",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bond",
            "type": "pubkey"
          },
          {
            "name": "holder",
            "type": "pubkey"
          },
          {
            "name": "units",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "proposal",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bond",
            "type": "pubkey"
          },
          {
            "name": "snapshot",
            "type": "pubkey"
          },
          {
            "name": "issuer",
            "type": "pubkey"
          },
          {
            "name": "proposalId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "contentHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "title",
            "type": "string"
          },
          {
            "name": "votingStartTs",
            "type": "i64"
          },
          {
            "name": "votingEndTs",
            "type": "i64"
          },
          {
            "name": "quorumBps",
            "type": "u16"
          },
          {
            "name": "approvalBps",
            "type": "u16"
          },
          {
            "name": "eligibleVotingPower",
            "type": "u64"
          },
          {
            "name": "yesVotingPower",
            "type": "u64"
          },
          {
            "name": "noVotingPower",
            "type": "u64"
          },
          {
            "name": "abstainVotingPower",
            "type": "u64"
          },
          {
            "name": "participatingVotingPower",
            "type": "u64"
          },
          {
            "name": "voterCount",
            "type": "u8"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "proposalStatus"
              }
            }
          },
          {
            "name": "createdAtTs",
            "type": "i64"
          },
          {
            "name": "createdSlot",
            "type": "u64"
          },
          {
            "name": "finalizedAtTs",
            "type": "i64"
          },
          {
            "name": "finalizedSlot",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "proposalCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "proposal",
            "type": "pubkey"
          },
          {
            "name": "bond",
            "type": "pubkey"
          },
          {
            "name": "snapshot",
            "type": "pubkey"
          },
          {
            "name": "issuer",
            "type": "pubkey"
          },
          {
            "name": "proposalId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "eligibleVotingPower",
            "type": "u64"
          },
          {
            "name": "votingStartTs",
            "type": "i64"
          },
          {
            "name": "votingEndTs",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "proposalFinalized",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "proposal",
            "type": "pubkey"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "proposalStatus"
              }
            }
          },
          {
            "name": "eligibleVotingPower",
            "type": "u64"
          },
          {
            "name": "yesVotingPower",
            "type": "u64"
          },
          {
            "name": "noVotingPower",
            "type": "u64"
          },
          {
            "name": "abstainVotingPower",
            "type": "u64"
          },
          {
            "name": "participatingVotingPower",
            "type": "u64"
          },
          {
            "name": "quorumMet",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "proposalStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "open"
          },
          {
            "name": "passed"
          },
          {
            "name": "rejected"
          }
        ]
      }
    },
    {
      "name": "recordDateSnapshot",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bond",
            "type": "pubkey"
          },
          {
            "name": "snapshotId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "issuer",
            "type": "pubkey"
          },
          {
            "name": "recordDateTs",
            "type": "i64"
          },
          {
            "name": "createdAtTs",
            "type": "i64"
          },
          {
            "name": "createdSlot",
            "type": "u64"
          },
          {
            "name": "finalizedAtTs",
            "type": "i64"
          },
          {
            "name": "finalizedSlot",
            "type": "u64"
          },
          {
            "name": "expectedHolderCount",
            "type": "u8"
          },
          {
            "name": "processedHolderCount",
            "type": "u8"
          },
          {
            "name": "nextIndex",
            "type": "u8"
          },
          {
            "name": "expectedTotalUnits",
            "type": "u64"
          },
          {
            "name": "totalUnits",
            "type": "u64"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "snapshotStatus"
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "redemption",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bond",
            "type": "pubkey"
          },
          {
            "name": "snapshot",
            "type": "pubkey"
          },
          {
            "name": "settlementMint",
            "type": "pubkey"
          },
          {
            "name": "escrow",
            "type": "pubkey"
          },
          {
            "name": "redemptionAuthority",
            "type": "pubkey"
          },
          {
            "name": "issuer",
            "type": "pubkey"
          },
          {
            "name": "faceValueBase",
            "type": "u64"
          },
          {
            "name": "snapshotTotalUnits",
            "type": "u64"
          },
          {
            "name": "expectedHolderCount",
            "type": "u8"
          },
          {
            "name": "requiredTotalBase",
            "type": "u64"
          },
          {
            "name": "fundedTotalBase",
            "type": "u64"
          },
          {
            "name": "paidTotalBase",
            "type": "u64"
          },
          {
            "name": "burnedUnits",
            "type": "u64"
          },
          {
            "name": "maturityTs",
            "type": "i64"
          },
          {
            "name": "createdAtTs",
            "type": "i64"
          },
          {
            "name": "createdSlot",
            "type": "u64"
          },
          {
            "name": "activatedAtTs",
            "type": "i64"
          },
          {
            "name": "activatedSlot",
            "type": "u64"
          },
          {
            "name": "claimCount",
            "type": "u8"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "redemptionStatus"
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "redemptionActivated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "redemption",
            "type": "pubkey"
          },
          {
            "name": "bond",
            "type": "pubkey"
          },
          {
            "name": "burnedUnits",
            "type": "u64"
          },
          {
            "name": "activatedAtTs",
            "type": "i64"
          },
          {
            "name": "activatedSlot",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "redemptionAuthority",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "redemption",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "redemptionClaimed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "redemption",
            "type": "pubkey"
          },
          {
            "name": "holder",
            "type": "pubkey"
          },
          {
            "name": "amountBase",
            "type": "u64"
          },
          {
            "name": "paidTotalBase",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "redemptionCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "redemption",
            "type": "pubkey"
          },
          {
            "name": "bond",
            "type": "pubkey"
          },
          {
            "name": "snapshot",
            "type": "pubkey"
          },
          {
            "name": "requiredTotalBase",
            "type": "u64"
          },
          {
            "name": "snapshotTotalUnits",
            "type": "u64"
          },
          {
            "name": "maturityTs",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "redemptionFunded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "redemption",
            "type": "pubkey"
          },
          {
            "name": "fundedTotalBase",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "redemptionReceipt",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "redemption",
            "type": "pubkey"
          },
          {
            "name": "holder",
            "type": "pubkey"
          },
          {
            "name": "amountBase",
            "type": "u64"
          },
          {
            "name": "paidAtTs",
            "type": "i64"
          },
          {
            "name": "paidSlot",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "redemptionStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "created"
          },
          {
            "name": "funded"
          },
          {
            "name": "activated"
          },
          {
            "name": "complete"
          }
        ]
      }
    },
    {
      "name": "registryEntry",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bond",
            "type": "pubkey"
          },
          {
            "name": "holder",
            "type": "pubkey"
          },
          {
            "name": "index",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "registryState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bond",
            "type": "pubkey"
          },
          {
            "name": "count",
            "type": "u8"
          },
          {
            "name": "totalUnits",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "settlementConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "config",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "decimals",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "settlementMintConfigured",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "config",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "snapshotBatchProcessed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "snapshot",
            "type": "pubkey"
          },
          {
            "name": "startIndex",
            "type": "u8"
          },
          {
            "name": "processedHolderCount",
            "type": "u8"
          },
          {
            "name": "totalUnits",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "snapshotCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "snapshot",
            "type": "pubkey"
          },
          {
            "name": "bond",
            "type": "pubkey"
          },
          {
            "name": "recordDateTs",
            "type": "i64"
          },
          {
            "name": "expectedHolderCount",
            "type": "u8"
          },
          {
            "name": "expectedTotalUnits",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "snapshotEntry",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "snapshot",
            "type": "pubkey"
          },
          {
            "name": "bond",
            "type": "pubkey"
          },
          {
            "name": "holder",
            "type": "pubkey"
          },
          {
            "name": "position",
            "type": "pubkey"
          },
          {
            "name": "registryIndex",
            "type": "u8"
          },
          {
            "name": "units",
            "type": "u64"
          },
          {
            "name": "recordDateTs",
            "type": "i64"
          },
          {
            "name": "recordedAtTs",
            "type": "i64"
          },
          {
            "name": "recordedSlot",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "snapshotEntryRecorded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "snapshot",
            "type": "pubkey"
          },
          {
            "name": "holder",
            "type": "pubkey"
          },
          {
            "name": "registryIndex",
            "type": "u8"
          },
          {
            "name": "units",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "snapshotFinalized",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "snapshot",
            "type": "pubkey"
          },
          {
            "name": "bond",
            "type": "pubkey"
          },
          {
            "name": "holderCount",
            "type": "u8"
          },
          {
            "name": "totalUnits",
            "type": "u64"
          },
          {
            "name": "finalizedAtTs",
            "type": "i64"
          },
          {
            "name": "finalizedSlot",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "snapshotStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "scheduled"
          },
          {
            "name": "processing"
          },
          {
            "name": "finalized"
          }
        ]
      }
    },
    {
      "name": "status",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "issuing"
          },
          {
            "name": "issuanceClosed"
          },
          {
            "name": "redeemed"
          }
        ]
      }
    },
    {
      "name": "voteCast",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "proposal",
            "type": "pubkey"
          },
          {
            "name": "voter",
            "type": "pubkey"
          },
          {
            "name": "choice",
            "type": {
              "defined": {
                "name": "voteChoice"
              }
            }
          },
          {
            "name": "weight",
            "type": "u64"
          },
          {
            "name": "participatingVotingPower",
            "type": "u64"
          },
          {
            "name": "voterCount",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "voteChoice",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "yes"
          },
          {
            "name": "no"
          },
          {
            "name": "abstain"
          }
        ]
      }
    },
    {
      "name": "voteReceipt",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "proposal",
            "type": "pubkey"
          },
          {
            "name": "voter",
            "type": "pubkey"
          },
          {
            "name": "weight",
            "type": "u64"
          },
          {
            "name": "choice",
            "type": {
              "defined": {
                "name": "voteChoice"
              }
            }
          },
          {
            "name": "castAtTs",
            "type": "i64"
          },
          {
            "name": "castSlot",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
