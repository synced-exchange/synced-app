import React from 'react'
import styled from 'styled-components'
import ReactPaginate from 'react-paginate'

const Wrapper = styled.div`
  margin: 0.8rem auto;
  font-size: 0.8rem;

  .pagination {
    display: flex;
    justify-content: center;
    list-style-type: none;
    margin: 0;
    padding: 0;
    overflow: hidden;

    & > li {
      float: left;
    }

    & > li a {
      display: block;
      text-align: center;
      padding: 1rem;
      text-decoration: none;

      :hover {
        cursor: pointer;
        background: ${({ theme }) => theme.bg1};
      }

      ${({ theme }) => theme.mediaWidth.upToSmall`
        padding: 1rem 0.8rem;
      `}
    }
  }
  .break {
    pointer-events: none;
  }
  .active {
    & > * {
      font-weight: 700;
      background: ${({ theme }) => theme.bg1};
    }
  }
  ${({ theme }) => theme.mediaWidth.upToSmall`
    font-size: 0.7rem;
  `}
`

export default function Pagination({
  pageCount,
  onPageChange,
}: {
  pageCount: number
  onPageChange: ({ selected }: { selected: number }) => void
}) {
  return (
    <Wrapper>
      <ReactPaginate
        previousLabel={'←'}
        nextLabel={'→'}
        breakLabel={'..'}
        breakClassName={'break'}
        pageCount={pageCount}
        marginPagesDisplayed={3} // how much to show at the beginning and end (using 2) => Previous 1, 2, .. , 9, 10 Next
        pageRangeDisplayed={3} // how much to show left and right from the current page (using 2) => Previous 1, 2 .. 9 10 (11) 12 13 ... 23 24 Next
        onPageChange={onPageChange}
        containerClassName={'pagination'}
        activeClassName={'active'}
      />
    </Wrapper>
  )
}
